const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const log = require('null-logger');
const moment = require('moment');
const sinon = require('sinon');
const fs = require('fs');
const proxyquire = require('proxyquire');

describe('Calendar Controller (Google)', () => {
  let restore;
  beforeEach(() => {
    delete require.cache[require.resolve('../../../controller/calendar/google')];
  });

  afterEach(() => {
    restore();
  });

  it('should get current event', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, null, {
      data: {
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
      },
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    const currentEvent = await GC(log)
      .getCurrentEvent();

    expect(currentEvent.summary).to.equal('18.4;95;5');
    assert.isTrue(authorizeSpy.called);
    assert.isTrue(listStub.called);
  });

  it('should get current event [fallback token dir]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, null, {
      data: {
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
      },
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    const currentEvent = await GC(log)
      .getCurrentEvent();

    expect(currentEvent.summary).to.equal('18.4;95;5');
    assert.isTrue(authorizeSpy.called);
    assert.isTrue(listStub.called);
  });

  it('should get current event [fallback start/end date format]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, null, {
      data: {
        items: [
          {
            summary: '18.4;95;5',
            start: {
              date: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              date: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      },
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    const currentEvent = await GC(log)
      .getCurrentEvent();

    expect(currentEvent.summary).to.equal('18.4;95;5');
    assert.isTrue(authorizeSpy.called);
    assert.isTrue(listStub.called);
  });

  it('should return no event', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, null, {
      data: {
        items: [
        ],
      },
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    const currentEvent = await GC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(authorizeSpy.called);
    assert.isTrue(listStub.called);
  });

  it('should return no event [not in range]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const authorizeSpy = sinon.spy();
    const listStub = sinon.stub().callsArgWith(1, null, {
      data: {
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
      },
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    const currentEvent = await GC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(authorizeSpy.called);
    assert.isTrue(listStub.called);
  });

  it('should throw [invalid service json]', async () => {
    restore = mockedEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: 'invalid.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT(obj) {
          fs.readFileSync(obj.keyFile);
        },
      },
    });

    try {
      await GC(log).getCurrentEvent();
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

    const GC = proxyquire('../../../controller/calendar/google', {
      'google-auth-library': {
        JWT: function JWT() {
          this.authorize = authorizeSpy;
        },
      },
      googleapis: {
        google: {
          calendar: () => ({
            events: {
              list: listStub,
            },
          }),
        },
      },
    });

    try {
      await GC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
