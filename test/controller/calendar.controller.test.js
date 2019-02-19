const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const log = require('null-logger');
const nock = require('nock');
const moment = require('moment');
const sinon = require('sinon');
const fs = require('fs');
const { request } = require('gaxios');
const proxyquire = require('proxyquire');

const CacheController = require('../../controller/cache.controller')(log);
// Preload files
require('../../controller/calendar.controller');

describe('Calendar Controller', () => {
  let restore;
  before(() => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });
  });

  after(() => {
    restore();
  });

  it('should get desired temperature', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '18.4',
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(18.4);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should get desired temperature with prioritization', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '18.4;95;5',
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(18.4);
    expect(desiredObj.master).to.equal(95);
    expect(desiredObj.slave).to.equal(5);
    assert.isTrue(authorizeSpy.called);
  });

  it('should return MIN_TEMP [no events]', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [],
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should return MIN_TEMP [event not in range]', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '18.4',
            start: {
              dateTime: moment().subtract(2, 'days').toISOString(),
            },
            end: {
              dateTime: moment().subtract(1, 'days').toISOString(),
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should return MIN_TEMP [wrong summery]', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: 'wrongSummery',
            start: {
              dateTime: moment().subtract(1, 'days').toISOString(),
            },
            end: {
              dateTime: moment().add(1, 'days').toISOString(),
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should return desired temperature [wrong sum of prio]', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '18.4;90;5',
            start: {
              dateTime: moment().subtract(1, 'days').toISOString(),
            },
            end: {
              dateTime: moment().add(1, 'days').toISOString(),
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(18.4);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should return MAX_TEMP [desired temp too high]', async () => {
    nock('https://www.googleapis.com:443')
      .get(new RegExp('/calendar/v3/calendars/tempea-mocked/events/*'))
      .reply(200, {
        items: [
          {
            summary: '49.2',
            start: {
              dateTime: moment().subtract(1, 'days').toISOString(),
            },
            end: {
              dateTime: moment().add(1, 'days').toISOString(),
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

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(27);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(authorizeSpy.called);
  });

  it('should throw [invalid service json]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'invalid.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      'google-auth-library': {
        JWT: function JWT(obj) {
          fs.readFileSync(obj.keyFile);
        },
      },
    });

    try {
      await CC(log, CacheController).getDesiredObject();
    } catch (err) {
      expect(err.code).to.equal('ENOENT');
    }
  });

  it('should throw [calendar.event.list]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, new Error(), 0);

    const CC = proxyquire('../../controller/calendar.controller', {
      googleapis: {
        google: {
          calendar() {
            return {
              events: {
                list: listStub,
              },
            };
          },
        },
      },
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
          this.request = async opts => request(opts);
        },
      },
    });

    try {
      await CC(log, CacheController).getDesiredObject();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
