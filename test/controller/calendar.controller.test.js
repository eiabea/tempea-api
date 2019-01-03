require('../Helper').invalidateNodeCache();

const { expect } = require('chai');
const log = require('null-logger');
const nock = require('nock');
const moment = require('moment');

const GOOGLE_CALENDAR_ID_VALID = '1337';
const GOOGLE_CALENDAR_ID_NO_EVENTS = '404';
const GOOGLE_CALENDAR_ID_NAN_SUMMERY = '400';
const GOOGLE_CALENDAR_ID_OVER_MAX_TEMP = '9000';
const GOOGLE_CALENDAR_ID_NOT_IN_RANGE = '004';
const MAX_TEMP = 37;
const MIN_TEMP = 17;

process.env.CI = 'true';
process.env.TOKEN_DIR = 'test/secrets';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'tempea-mocked.json';

process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID_VALID;

// Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../../controller/calendar.controller')];

const CacheController = require('../../controller/cache.controller')(log);
const CalendarController = require('../../controller/calendar.controller')(log, CacheController);

describe('Calendar Controller', () => {
  before(() => {
    nock('https://www.googleapis.com:443')
      .post('/oauth2/v4/token')
      .times(6)
      .reply(200, {
        access_token: '1/fFAGRNJru1FTz70BzhT3Zg',
        expires_in: 3920,
        token_type: 'Bearer',
        refresh_token: '1/xEoDL4iW3cxlI7yDbSRFYNG01kVKM2C-259HOF2aQbI',
      });
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID_VALID}/events/*`))
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
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID_NO_EVENTS}/events/*`))
      .reply(200, {
        items: [],
      });
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID_NAN_SUMMERY}/events/*`))
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
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID_OVER_MAX_TEMP}/events/*`))
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
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID_NOT_IN_RANGE}/events/*`))
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
  });

  it('should get desired temperature', async () => {
    const desiredTemp = await CalendarController.getDesiredTemperature();

    expect(desiredTemp).to.equal(18.4);
  });

  it('should return MIN_TEMP [no events]', async () => {
    process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID_NO_EVENTS;
    process.env.MIN_TEMP = MIN_TEMP;

    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../../controller/calendar.controller')];

    // eslint-disable-next-line global-require
    const desiredTemp = await require('../../controller/calendar.controller')(log, CacheController)
      .getDesiredTemperature();

    expect(desiredTemp).to.equal(MIN_TEMP);
  });

  it('should return MIN_TEMP [event not in range]', async () => {
    process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID_NOT_IN_RANGE;

    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../../controller/calendar.controller')];

    // eslint-disable-next-line global-require
    const desiredTemp = await require('../../controller/calendar.controller')(log, CacheController)
      .getDesiredTemperature();

    expect(desiredTemp).to.equal(MIN_TEMP);
  });

  it('should return MIN_TEMP [wrong summery]', async () => {
    process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID_NAN_SUMMERY;
    process.env.MIN_TEMP = MIN_TEMP;

    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../../controller/calendar.controller')];

    // eslint-disable-next-line global-require
    const desiredTemp = await require('../../controller/calendar.controller')(log, CacheController)
      .getDesiredTemperature();

    expect(desiredTemp).to.equal(MIN_TEMP);
  });

  it('should return MAX_TEMP [desired temp too high]', async () => {
    process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID_OVER_MAX_TEMP;
    process.env.MAX_TEMP = MAX_TEMP;
    process.env.MIN_TEMP = MIN_TEMP;

    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../../controller/calendar.controller')];

    // eslint-disable-next-line global-require
    const desiredTemp = await require('../../controller/calendar.controller')(log, CacheController)
      .getDesiredTemperature();

    expect(desiredTemp).to.equal(MAX_TEMP);
  });

  it('should through [invalid service json]', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'invalid.json';

    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../../controller/calendar.controller')];

    try {
      // eslint-disable-next-line global-require
      await require('../../controller/calendar.controller')(log, CacheController)
        .getDesiredTemperature();
    } catch (err) {
      expect(err.code).to.equal('ENOENT');
    }
  });
});
