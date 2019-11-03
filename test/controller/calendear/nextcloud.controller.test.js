const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const sinon = require('sinon');
const log = require('null-logger');
const moment = require('moment-timezone');
const proxyquire = require('proxyquire');

describe('Calendar Controller (NextCloud)', () => {
  let restore;
  beforeEach(() => {
    delete require.cache[require.resolve('../../../controller/calendar/nextcloud')];
  });

  afterEach(() => {
    restore();
  });

  it('should get current event', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    // Create a event in the distant past to test the RRule handling
    const startDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const endDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const startTime = moment().tz('Europe/Vienna').subtract(1, 'hour').format('HHmmss');
    const endTime = moment().tz('Europe/Vienna').add(1, 'hour').format('HHmmss');

    const syncCalendarStub = sinon.stub().returns({
      objects: [
        {
          calendarData: `BEGIN:VCALENDAR
PRODID:-//Nextcloud calendar v1.6.4
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
CREATED:20190307T111622
DTSTAMP:20190307T111622
LAST-MODIFIED:20190307T111622
UID:A94ZKFIOEBR242A7B25YB2
SUMMARY:18.4\\;95\\;5
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${startDate}T${startTime}
DTEND;TZID=Europe/Vienna:${endDate}T${endTime}
END:VEVENT
BEGIN:VTIMEZONE
TZID:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`,
        },
      ],
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: syncCalendarStub,
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const currentEvent = await NC(log)
      .getCurrentEvent();

    expect(currentEvent.summary).to.equal('18.4;95;5');
    assert.isTrue(syncCalendarStub.called);
  });

  it('should fail to get current event [no host]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {});

    try {
      await NC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get current event [no username]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {});

    try {
      await NC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get current event [no password]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {});

    try {
      await NC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get current event [no calendar]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    try {
      await NC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should return no event', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const syncCalendarStub = sinon.stub().returns({
      objects: [],
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: syncCalendarStub,
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const currentEvent = await NC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(syncCalendarStub.called);
  });

  it('should return no event [not in range time]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const startDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const endDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const startTime = moment().tz('Europe/Vienna').subtract(2, 'hour').format('HHmmss');
    const endTime = moment().tz('Europe/Vienna').subtract(1, 'hour').format('HHmmss');

    const syncCalendarStub = sinon.stub().returns({
      objects: [
        {
          calendarData: `BEGIN:VCALENDAR
PRODID:-//Nextcloud calendar v1.6.4
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
CREATED:20190307T111622
DTSTAMP:20190307T111622
LAST-MODIFIED:20190307T111622
UID:A94ZKFIOEBR242A7B25YB2
SUMMARY:18.4\\;95\\;5
CLASS:PUBLIC
STATUS:CONFIRMED
DTSTART;TZID=Europe/Vienna:${startDate}T${startTime}
DTEND;TZID=Europe/Vienna:${endDate}T${endTime}
END:VEVENT
BEGIN:VTIMEZONE
TZID:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`,
        },
      ],
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: syncCalendarStub,
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const currentEvent = await NC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(syncCalendarStub.called);
  });

  it('should return no event [not in range rrule daily]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const startDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const endDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const startTime = moment().tz('Europe/Vienna').subtract(2, 'hour').format('HHmmss');
    const endTime = moment().tz('Europe/Vienna').subtract(1, 'hour').format('HHmmss');

    const syncCalendarStub = sinon.stub().returns({
      objects: [
        {
          calendarData: `BEGIN:VCALENDAR
PRODID:-//Nextcloud calendar v1.6.4
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
CREATED:20190307T111622
DTSTAMP:20190307T111622
LAST-MODIFIED:20190307T111622
UID:A94ZKFIOEBR242A7B25YB2
SUMMARY:18.4\\;95\\;5
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${startDate}T${startTime}
DTEND;TZID=Europe/Vienna:${endDate}T${endTime}
END:VEVENT
BEGIN:VTIMEZONE
TZID:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`,
        },
      ],
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: syncCalendarStub,
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const currentEvent = await NC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(syncCalendarStub.called);
  });

  it('should return no event [not in range rrule yearly]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const startDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const endDate = moment().tz('Europe/Vienna').subtract(10, 'days').format('YYYYMMDD');
    const startTime = moment().tz('Europe/Vienna').subtract(1, 'hour').format('HHmmss');
    const endTime = moment().tz('Europe/Vienna').add(1, 'hour').format('HHmmss');

    const syncCalendarStub = sinon.stub().returns({
      objects: [
        {
          calendarData: `BEGIN:VCALENDAR
PRODID:-//Nextcloud calendar v1.6.4
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
CREATED:20190307T111622
DTSTAMP:20190307T111622
LAST-MODIFIED:20190307T111622
UID:A94ZKFIOEBR242A7B25YB2
SUMMARY:18.4\\;95\\;5
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=YEARLY
DTSTART;TZID=Europe/Vienna:${startDate}T${startTime}
DTEND;TZID=Europe/Vienna:${endDate}T${endTime}
END:VEVENT
BEGIN:VTIMEZONE
TZID:Europe/Vienna
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`,
        },
      ],
    });

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: syncCalendarStub,
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const currentEvent = await NC(log)
      .getCurrentEvent();

    assert.isNull(currentEvent);
    assert.isTrue(syncCalendarStub.called);
  });

  it('should throw [dav.createAccount]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const createAccountStub = sinon.stub().throws('Mocked Error');

    const NC = proxyquire('../../../controller/calendar/nextcloud', {
      dav: {
        createAccount: createAccountStub,
      },
    });

    try {
      await NC(log).getCurrentEvent();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
