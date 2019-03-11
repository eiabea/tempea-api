const { assert } = require('chai');

const dav = require('dav');
const ical = require('node-ical');

const moment = require('moment-timezone');

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
              start: moment.utc().format('YYYYMMDDT000000'),
              end: moment.utc().format('YYYYMMDDT235959'),
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
    // eslint-disable-next-line no-restricted-syntax
    for (const calObj of calArray) {
      // eslint-disable-next-line no-restricted-syntax
      for (const eventId of Object.keys(calObj)) {
        const { type } = calObj[eventId];
        if (type === 'VEVENT') {
          const { start, end } = calObj[eventId];
          let momentStart = moment(start).tz(start.tz);
          let momentEnd = moment(end).tz(end.tz);

          // check if event is a single event or contains recurrent information
          if (calObj[eventId].rrule) {
            // See if date now and one of the rrule dates match
            const recurrentEvents = calObj[eventId].rrule
              .between(moment.utc().tz(start.tz).subtract(2, 'day').toDate(), moment.utc().tz(end.tz).toDate());
            const today = moment.utc().tz(start.tz);
            const foundForToday = recurrentEvents.find(rE => moment.utc(rE).day() === today.day()
              && moment.utc(rE).month() === today.month()
              && moment.utc(rE).year() === today.year());
            // if one matches check if now is between start and end time of the event
            if (foundForToday) {
              // bring start/end time of event to the present
              const fakedStart = moment.utc().tz(start.tz);
              fakedStart.hour(momentStart.hour());
              fakedStart.minute(momentStart.minute());
              fakedStart.second(momentStart.second());
              fakedStart.milliseconds(momentStart.milliseconds());

              const fakedEnd = moment.utc().tz(end.tz);
              fakedEnd.hour(momentEnd.hour());
              fakedEnd.minute(momentEnd.minute());
              fakedEnd.second(momentEnd.second());
              fakedEnd.milliseconds(momentEnd.milliseconds());

              momentStart = fakedStart;
              momentEnd = fakedEnd;
            }
          }

          if (moment.utc().tz(start.tz).isBetween(momentStart, momentEnd)) {
            currentEvent = calObj[eventId];
            break;
          }
        }
      }
    }

    return currentEvent;
  };

  return {
    getCurrentEvent,
  };
};
