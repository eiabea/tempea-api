const { assert } = require('chai');
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');

const calendar = google.calendar('v3');
const moment = require('moment');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const GOOGLE_AUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const { GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;
const TOKEN_DIR = process.env.TOKEN_DIR || 'secrets';
const TOKEN_PATH = `${process.cwd()}/${TOKEN_DIR}/${GOOGLE_SERVICE_ACCOUNT_JSON}`;
const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

module.exports = (log, cache) => {
  const getGoogleAuthClient = async () => {
    try {
      const jwtClient = new JWT({
        keyFile: TOKEN_PATH,
        scopes: GOOGLE_AUTH_SCOPES,
      });

      await jwtClient.authorize();

      return jwtClient;
    } catch (err) {
      log.error({ err }, 'Error initializing google jwt auth client');
      throw err;
    }
  };

  const listEvents = async auth => new Promise((resolve, reject) => {
    calendar.events.list({
      auth,
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: (new Date()).toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, response) => {
      if (err) {
        return reject(err);
      }

      return resolve(response.data.items);
    });
  });

  /*
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
  const getCurrentEvent = async (auth) => {
    const events = await listEvents(auth);
    if (events.length === 0) {
      log.info('No upcoming events found.');
      return null;
    }

    const event = events[0];

    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const utcStart = moment.utc(start);
    const utcEnd = moment.utc(end);

    if (!moment().isBetween(utcStart, utcEnd)) {
      log.trace({ event }, 'Event is not in range');
      return null;
    }
    log.trace({ event }, 'Event is in range');
    return event;
  };

  const getDesiredTemperature = async () => {
    log.trace('getDesiredTemperature');

    const auth = await getGoogleAuthClient();
    const event = await getCurrentEvent(auth);
    if (!event) {
      return MIN_TEMP;
    }

    let desiredTemp;
    try {
      desiredTemp = parseFloat(event.summary);
      assert.isNotNaN(desiredTemp);
    } catch (e) {
      log.error({ e }, 'Unable to parse, fallback to MIN_TEMP');
      desiredTemp = MIN_TEMP;
    }

    if (desiredTemp > MAX_TEMP) {
      desiredTemp = MAX_TEMP;
    }

    await cache.updateDesiredTemperature(desiredTemp);

    return desiredTemp;
  };

  return {
    getDesiredTemperature,
  };
};
