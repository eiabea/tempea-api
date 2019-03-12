const mockedEnv = require('mocked-env');
const chai = require('chai');
const nock = require('nock');
const moment = require('moment');
const proxyquire = require('proxyquire');
const { request } = require('gaxios');
const log = require('null-logger');
const sinon = require('sinon');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

describe('Status Route (Master)', () => {
  let restore;
  let app;
  let expressApp;
  let controller;

  before(async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'google',
      EXPRESS_PORT: '3001',
      SLAVE_ENABLED: 'true',
      SLAVE_HOST: 'mocked.tempea.com',
      SLAVE_PORT: '80',
      SLAVE_ENDPOINT: '/mocked',
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
      INFLUX_HOST: 'influx',
      INFLUX_PORT: '8086',
    });

    const RC = proxyquire.noCallThru().load('../../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          function read(callback) {
            return callback(null, 0);
          }

          function write(newState, callback) {
            return callback(null, newState);
          }

          return {
            read,
            write,
          };
        },
      },
    });

    const TC = proxyquire('../../../controller/temp.controller', {
      ds18b20: {
        temperature: sinon.stub().callsArgWith(1, null, 21),
      },
    });

    const App = proxyquire.noCallThru().load('../../../app', {
      './controller/relay.controller': RC,
      './controller/temp.controller': TC,
    });

    app = App(60);
    await app.start();
    // ensure that no job gets triggered by cron
    await app.stopJob();
    expressApp = app.getExpressApp();
    controller = app.getController();
  });

  beforeEach(async () => {
    await controller.cache.invalidate();
  });

  afterEach(async () => {
    await controller.cache.invalidate();
  });

  after(async () => {
    await app.stop();
    restore();
  });

  it('should get status', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 12.5,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    // Mock influx
    nock('http://influx:8086')
      .get(/.*/g)
      .reply(200, {
        results: [
          {
            statement_id: 0,
            series: [
              {
              // default name set by telegraf
                name: 'mqtt_consumer',
                columns: [
                  'time',
                  'last',
                ],
                values: [
                  [
                    1550586338221,
                    12.5,
                  ],
                ],
              },
            ],
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { master } = data;
    const { desired } = data;
    const { slave } = data;
    const { mqtt } = data;

    assert.isTrue(body.success);

    assert.isDefined(master);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(master.heating);
    assert.isNumber(master.updated);
    expect(master.temp).to.eq(21);

    assert.isDefined(desired);
    assert.isNumber(desired.updated);
    expect(desired.temp).to.eq(25.4);
    expect(desired.master).to.eq(100);
    expect(desired.slave).to.eq(0);

    assert.isDefined(slave);
    assert.isNumber(slave.updated);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);

    assert.isDefined(mqtt);
    expect(mqtt.updated).to.equal(1550586338221);
    expect(mqtt.temp).to.equal(12.5);
  });

  it('should get status [with prio]', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 19,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '20.4;0;100',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);

    assert.isDefined(master);
    // Desired temp is 20.4, master temperature is high enough (21), but master has 0% priority,
    // so only the slave temperature is getting into account and heating should be on
    assert.isTrue(master.heating);
    expect(master.temp).to.eq(21);

    assert.isDefined(desired);
    expect(desired.temp).to.eq(20.4);
    expect(desired.master).to.eq(0);
    expect(desired.slave).to.eq(100);

    assert.isDefined(slave);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);
  });

  it('should get status [no slave]', async () => {
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(404);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);

    assert.isDefined(master);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(master.heating);
    expect(master.temp).to.eq(21);

    assert.isDefined(desired);
    expect(desired.temp).to.eq(25.4);
    expect(desired.master).to.eq(100);
    expect(desired.slave).to.eq(0);

    assert.isUndefined(slave);
  });

  it('should get status [no slave, with prio]', async () => {
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(404);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4;50;50',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);

    assert.isDefined(master);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(master.heating);
    expect(master.temp).to.eq(21);

    assert.isDefined(desired);
    expect(desired.temp).to.eq(25.4);
    expect(desired.master).to.eq(50);
    expect(desired.slave).to.eq(50);

    assert.isUndefined(slave);
  });

  it('should get status [invalid mqtt value]', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 12.5,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    // Mock influx
    nock('http://influx:8086')
      .get(/.*/g)
      .reply(200, {
        results: [
          {
            statement_id: 0,
            invalid: [],
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { master } = data;
    const { desired } = data;
    const { slave } = data;
    const { mqtt } = data;

    assert.isTrue(body.success);

    assert.isDefined(master);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(master.heating);
    expect(master.temp).to.eq(21);

    assert.isDefined(desired);
    expect(desired.temp).to.eq(25.4);
    expect(desired.master).to.eq(100);
    expect(desired.slave).to.eq(0);

    assert.isDefined(slave);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);

    assert.isUndefined(mqtt);
  });

  it('should get status [error in temperatures]', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 12.5,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    const mockedCalendar = await CC(log, controller.cache);
    const stubDesired = sinon.stub(mockedCalendar, 'getDesiredObject')
      .throws(new Error('Unable to get mocked temp'));
    controller.calendar = mockedCalendar;

    const stubRead = sinon.stub();
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 1 state
    stubRead.onCall(0).callsArgWith(0, null, 1);

    // Temperatures fail, so the relay should be off, simulate write
    const stubWrite = sinon.stub().callsArgWith(1, null);

    const RC = proxyquire.noCallThru().load('../../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stubRead,
            write: stubWrite,
          };
        },
      },
    });

    controller.relay = RC(log, controller.cache);

    // Run the job
    await app.forceJob();

    // getDesiredObject fails instant, so no authorize call
    assert.isFalse(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);
    // The job returns if one or more temperatures are not available and turns of heating
    assert.isUndefined(desired);
    assert.isUndefined(master.temp);
    // Heating has to be disabled on unknown temperatures
    assert.isFalse(master.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);

    assert.isTrue(stubDesired.called);
    assert.isTrue(stubRead.called);
    assert.isTrue(stubWrite.called);

    stubDesired.restore();
  });

  it('should get status [error in relay write]', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 12.5,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    const mockedCalendar = await CC(log, controller.cache);
    const stubDesired = sinon.stub(mockedCalendar, 'getDesiredObject')
      .throws(new Error('Unable to get mocked temp'));
    controller.calendar = mockedCalendar;

    const stubRead = sinon.stub();
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 1 state
    stubRead.onCall(0).callsArgWith(0, null, 1);
    // Temperatures fail, so the relay should be off, simulate write
    const stubWrite = sinon.stub().callsArgWith(1, new Error('Mocked relay error'));

    const RC = proxyquire.noCallThru().load('../../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stubRead,
            write: stubWrite,
          };
        },
      },
    });

    controller.relay = RC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isFalse(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);
    // The job returns if one or more temperatures are not available and turns of heating
    assert.isUndefined(desired);
    assert.isUndefined(master.temp);
    // Heating should be false, but setting the relay fails, so cache never gets set
    assert.isUndefined(master.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);

    assert.isTrue(stubDesired.called);
    assert.isTrue(stubRead.called);
    assert.isTrue(stubWrite.called);

    stubDesired.restore();
  });

  it('should get status [second error in relay write]', async () => {
    const mockedSlaveData = {
      success: true,
      data: {
        temp: 12.5,
        hum: 32,
      },
    };
    // Mock slave
    nock('http://mocked.tempea.com:80')
      .get('/mocked')
      .reply(200, mockedSlaveData);

    // Mock calendar
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '25.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

    const authorizeSpy = sinon.spy();

    const google = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const CC = proxyquire('../../../controller/calendar.controller', {
      './calendar/google': google,
    });

    controller.calendar = await CC(log, controller.cache);

    const stubRead = sinon.stub();
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 0 state
    stubRead.onCall(0).callsArgWith(0, null, 0);
    const stubWrite = sinon.stub();
    // Write fails
    stubWrite.onCall(0).callsArgWith(1, new Error('Mocked relay error'));

    const RC = proxyquire.noCallThru().load('../../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stubRead,
            write: stubWrite,
          };
        },
      },
    });

    controller.relay = RC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;
    const { master } = data;
    const { slave } = data;

    assert.isTrue(body.success);
    expect(desired.temp).to.eq(25.4);
    expect(master.temp).to.eq(21);
    // Heating should be true, but setting the relay fails, so cache never gets set
    assert.isUndefined(master.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.temp).to.equal(mockedSlaveData.data.temp);
    expect(slave.hum).to.equal(mockedSlaveData.data.hum);

    assert.isTrue(stubRead.called);
    assert.isTrue(stubWrite.called);
  });

  it('should get status [faulty slave]', async () => {
    const stub = sinon.stub(controller.cache, 'getSlaveData').returns(undefined);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    assert.isUndefined(slave);

    stub.restore();
  });

  it('should get status [no desired]', async () => {
    const stub = sinon.stub(controller.cache, 'getDesiredObject')
      .throws(new Error('Mocked error'));

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { desired } = data;

    assert.isTrue(body.success);
    assert.isUndefined(desired);

    stub.restore();
  });

  it('should get status [no relay]', async () => {
    const stub = sinon.stub(controller.cache, 'getRelayState')
      .throws(new Error('Mocked error'));

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { master } = data;

    assert.isTrue(body.success);
    assert.isUndefined(master.heating);

    stub.restore();
  });

  it('should get status [no current temperature]', async () => {
    const stub = sinon.stub(controller.cache, 'getCurrentTemperature')
      .throws(new Error('Mocked error'));

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { master } = data;

    assert.isTrue(body.success);
    assert.isUndefined(master.temp);

    stub.restore();
  });
});
