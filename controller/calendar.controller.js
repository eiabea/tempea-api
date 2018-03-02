const fs = require('fs');
const { assert } = require('chai');
const { JWT } = require('google-auth-library');
const calendar = require('googleapis').calendar('v3');
// const googleAuth = require('google-auth-library');
// const { OAuth2Client } = require('google-auth-library');
const moment = require('moment');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const GOOGLE_AUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
//   process.env.USERPROFILE) + '/.credentials/';
const { GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;
const TOKEN_DIR = process.env.TOKEN_DIR || 'secrets';
// const TOKEN_PATH = `${TOKEN_DIR}/calendar-nodejs-quickstart.json`;
const TOKEN_PATH = `${process.cwd()}/${TOKEN_DIR}/${GOOGLE_SERVICE_ACCOUNT_JSON}`;
const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

module.exports = (log) => {
  const getServiceJson = () => new Promise((resolve, reject) => {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, async (err, token) => {
      if (err) {
        return reject(err);
      }

      return resolve(JSON.parse(token));
    });
  });

  const getGoogleAuthClient = async () => {
    try {
      const serviceAccount = await getServiceJson();

      const jwtClient = new JWT(
        serviceAccount.client_email,
        null,
        serviceAccount.private_key,
        GOOGLE_AUTH_SCOPES,
      );

      await jwtClient.authorize();

      return jwtClient;
    } catch (err) {
      log.error({ err }, 'Error initializing google jwt auth client', err);
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

    return desiredTemp;
  };

  return {
    getDesiredTemperature,
  };
};
