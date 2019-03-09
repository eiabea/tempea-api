const { assert } = require('chai');

const dav = require('dav');
const ical = require('node-ical');

const moment = require('moment');

module.exports = (log) => {
  const getCurrentEvent = async () => {
    const {
      NEXTCLOUD_HOST, NEXTCLOUD_USERNAME, NEXTCLOUD_PASSWORD, NEXTCLOUD_CALENDAR,
    } = process.env;

    log.trace('Creating xhr credentials');
    assert.isString(NEXTCLOUD_USERNAME, 'No nextcloud user defined');
    assert.isString(NEXTCLOUD_PASSWORD, 'No nextcloud password defined');
    const xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: NEXTCLOUD_USERNAME,
        password: NEXTCLOUD_PASSWORD,
      }),
    );

    log.trace('Creating account');
    assert.isString(NEXTCLOUD_HOST, 'No nextcloud host defined');
    const account = await dav.createAccount({
      server: NEXTCLOUD_HOST,
      xhr,
    });

    assert.isString(NEXTCLOUD_CALENDAR, 'No nextcloud calendar name defined');

    const foundCal = account.calendars.find(cal => cal.displayName === NEXTCLOUD_CALENDAR);

    log.trace({ calendar: NEXTCLOUD_CALENDAR }, 'Syncing calendar');
    const syncedCalendar = await dav.syncCalendar(foundCal, {
      filters: [{
        type: 'comp-filter',
        attrs: { name: 'VCALENDAR' },
        children: [{
          type: 'comp-filter',
          attrs: { name: 'VEVENT' },
          children: [{
            type: 'time-range',
            attrs: {
              start: moment().format('YYYYMMDDT000000'),
              end: moment().format('YYYYMMDDT235959'),
            },
          }],
        }],
      }],
      xhr,
    });

    log.trace({ calendar: NEXTCLOUD_CALENDAR }, 'Parsing calendar event');
    const calArray = syncedCalendar.objects.map(cal => ical.parseICS(cal.calendarData));

    let currentEvent = null;

    // TODO refactor
    /* eslint-disable */
    for (const calObj of calArray) {
      for (const eventId of Object.keys(calObj)) {
        const { type } = calObj[eventId];
        if (type === 'VEVENT') {
          const { start, end } = calObj[eventId];

          const utcStart = moment.utc(start);
          const utcEnd = moment.utc(end);

          if (moment().isBetween(utcStart, utcEnd)) {
            currentEvent = calObj[eventId];
            break;
          }
        }
      }
    }
    /* eslint-enable */

    return currentEvent;
  };

  return {
    getCurrentEvent,
  };
};
