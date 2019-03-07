const mockedEnv = require('mocked-env');
const { expect } = require('chai');
const log = require('null-logger');
const moment = require('moment');
const proxyquire = require('proxyquire');

const CacheController = require('../../controller/cache.controller')(log);
// Preload files
require('../../controller/calendar.controller');

describe('Calendar Controller (NextCloud)', () => {
  let restore;
  before(() => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      NEXTCLOUD_HOST: 'https://nextcloud.mocked.at/remote.php/dav',
      NEXTCLOUD_USERNAME: 'eiabea',
      NEXTCLOUD_PASSWORD: 'secret',
      NEXTCLOUD_CALENDAR: 'tempea',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });
  });

  after(() => {
    restore();
  });

  it('should get desired temperature', async () => {
    const start = moment().subtract(1, 'days').format('YYYYMMDDT000000');
    const end = moment().add(1, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:22
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(22);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should get desired temperature with prioritization', async () => {
    const start = moment().subtract(1, 'days').format('YYYYMMDDT000000');
    const end = moment().add(1, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:22\\;50\\;50
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(22);
    expect(desiredObj.master).to.equal(50);
    expect(desiredObj.slave).to.equal(50);
  });

  it('should return MIN_TEMP [no events]', async () => {
    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
          objects: [],
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should return MIN_TEMP [event not in range]', async () => {
    const start = moment().subtract(10, 'days').format('YYYYMMDDT000000');
    const end = moment().subtract(9, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:22\\;50\\;50
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should return MIN_TEMP [wrong summery]', async () => {
    const start = moment().subtract(1, 'days').format('YYYYMMDDT000000');
    const end = moment().add(1, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:wrongSummery
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should return desired temperature [wrong sum of prio]', async () => {
    const start = moment().subtract(1, 'days').format('YYYYMMDDT000000');
    const end = moment().add(1, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:18;40;40
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(18);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should return MAX_TEMP [desired temp too high]', async () => {
    const start = moment().subtract(1, 'days').format('YYYYMMDDT000000');
    const end = moment().add(1, 'days').format('YYYYMMDDT235959');

    const nextcloud = proxyquire('../../controller/calendar/nextcloud', {
      dav: {
        syncCalendar: () => ({
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
SUMMARY:49.2
CLASS:PUBLIC
STATUS:CONFIRMED
RRULE:FREQ=DAILY
DTSTART;TZID=Europe/Vienna:${start}
DTEND;TZID=Europe/Vienna:${end}
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
        }),
        createAccount: () => ({
          calendars: [
            {
              displayName: 'tempea',
            },
          ],
        }),
      },
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': nextcloud,
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(27);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });
});
