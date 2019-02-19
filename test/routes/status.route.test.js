const mockedEnv = require('mocked-env');
const chai = require('chai');
const nock = require('nock');
const moment = require('moment');
const proxyquire = require('proxyquire');
const { request } = require('gaxios');
const log = require('null-logger');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const sinon = require('sinon');
const mockedRelay = require('../mock/relay');

describe('Status Route', () => {
  let restore;
  let app;
  let expressApp;
  let controller;

  before(async () => {
    restore = mockedEnv({
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

    delete require.cache[require.resolve('../../app')];
    // eslint-disable-next-line global-require
    const App = require('../../app');
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;
    const { mqtt } = data;

    assert.isTrue(body.success);
    expect(data.desiredTemp.desired).to.eq(25.4);
    expect(data.desiredTemp.master).to.eq(100);
    expect(data.desiredTemp.slave).to.eq(0);
    expect(data.currentTemp).to.eq(21);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(data.heating);
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveData.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveData.data.hum);
    assert.isDefined(mqtt);
    expect(mqtt.updated).to.equal(1550586338221);
    expect(mqtt.value).to.equal(12.5);
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    expect(data.desiredTemp.desired).to.eq(20.4);
    expect(data.desiredTemp.master).to.eq(0);
    expect(data.desiredTemp.slave).to.eq(100);
    expect(data.currentTemp).to.eq(21);
    // Desired temp is 20.4, master temperature is high enough (21), but master has 0% priority,
    // so only the slave temperature is getting into account and heating should be on
    assert.isTrue(data.heating);
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveData.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveData.data.hum);
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    expect(data.desiredTemp.desired).to.eq(25.4);
    expect(data.desiredTemp.master).to.eq(100);
    expect(data.desiredTemp.slave).to.eq(0);
    expect(data.currentTemp).to.eq(21);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(data.heating);
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    controller.calendar = await CC(log, controller.cache);

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    expect(data.desiredTemp.desired).to.eq(25.4);
    expect(data.desiredTemp.master).to.eq(50);
    expect(data.desiredTemp.slave).to.eq(50);
    expect(data.currentTemp).to.eq(21);
    // Desired temp is 25.4, mocked ds18b20 returns 21 -> heating on
    assert.isTrue(data.heating);
    assert.isUndefined(slave);
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const mockedCalendar = await CC(log, controller.cache);
    const stubDesired = sinon.stub(mockedCalendar, 'getDesiredObject')
      .throws(new Error('Unable to get mocked temp'));
    controller.calendar = mockedCalendar;

    controller.relay = proxyquire('../../controller/relay.controller', {
      '../test/mock/relay': mockedRelay,
    })(log, controller.cache);

    const stubRead = sinon.stub(mockedRelay, 'read');
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 1 state
    stubRead.onCall(0).callsArgWith(0, null, 1);
    // Temperatures fail, so the relay should be off, simulate write
    const stubWrite = sinon.stub(mockedRelay, 'write').callsArgWith(1, null);
    // Now the cache should see the disabled heating

    // Run the job
    await app.forceJob();

    // getDesiredObject fails instant, so no authorize call
    assert.isFalse(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    // The job returns if one or more temperatures are not available and turns of heating
    assert.isUndefined(data.desiredTemp);
    assert.isUndefined(data.currentTemp);
    // Heating has to be disabled on unknown temperatures
    assert.isFalse(data.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveData.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveData.data.hum);

    stubDesired.restore();
    stubRead.restore();
    stubWrite.restore();
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    const mockedCalendar = await CC(log, controller.cache);
    const stubDesired = sinon.stub(mockedCalendar, 'getDesiredObject')
      .throws(new Error('Unable to get mocked temp'));
    controller.calendar = mockedCalendar;

    controller.relay = proxyquire('../../controller/relay.controller', {
      '../test/mock/relay': mockedRelay,
    })(log, controller.cache);

    const stubRead = sinon.stub(mockedRelay, 'read');
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 1 state
    stubRead.onCall(0).callsArgWith(0, null, 1);
    // Temperatures fail, so the relay should be off, simulate write
    const stubWrite = sinon.stub(mockedRelay, 'write').callsArgWith(1, new Error('Mocked relay error'));

    // Run the job
    await app.forceJob();

    assert.isFalse(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    // The job returns if one or more temperatures are not available and turns of heating
    assert.isUndefined(data.desiredTemp);
    assert.isUndefined(data.currentTemp);
    // Heating should be false, but setting the relay fails, so cache never gets set
    assert.isUndefined(data.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveData.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveData.data.hum);

    stubRead.restore();
    stubWrite.restore();
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

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    controller.calendar = await CC(log, controller.cache);

    controller.relay = proxyquire('../../controller/relay.controller', {
      '../test/mock/relay': mockedRelay,
    })(log, controller.cache);

    const stubRead = sinon.stub(mockedRelay, 'read');
    // First "setRelay" gets called, which first gets the current state
    // Simulate a 0 state
    stubRead.onCall(0).callsArgWith(0, null, 0);
    const stubWrite = sinon.stub(mockedRelay, 'write');
    // Write fails
    stubWrite.onCall(0).callsArgWith(1, new Error('Mocked relay error'));

    // Run the job
    await app.forceJob();

    assert.isTrue(authorizeSpy.called);

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    expect(data.desiredTemp.desired).to.eq(25.4);
    expect(data.currentTemp).to.eq(21);
    // Heating should be true, but setting the relay fails, so cache never gets set
    assert.isUndefined(data.heating);
    // The slave should work as expected
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveData.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveData.data.hum);

    stubRead.restore();
    stubWrite.restore();
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

    assert.isTrue(body.success);
    assert.isUndefined(data.desiredTemp);

    stub.restore();
  });

  it('should get status [no relay]', async () => {
    const stub = sinon.stub(controller.cache, 'getRelayState')
      .throws(new Error('Mocked error'));

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isUndefined(data.heating);

    stub.restore();
  });

  it('should get status [no current temperature]', async () => {
    const stub = sinon.stub(controller.cache, 'getCurrentTemperature')
      .throws(new Error('Mocked error'));

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isUndefined(data.currentTemp);

    stub.restore();
  });
});
