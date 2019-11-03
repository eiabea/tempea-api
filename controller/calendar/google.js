const { JWT } = require('google-auth-library');
const { google } = require('googleapis');

const calendar = google.calendar('v3');
const moment = require('moment');

module.exports = (log) => {
  const getGoogleAuthClient = async () => {
    log.trace('Getting Google Auth Client');
    // If modifying these scopes, delete your previously saved credentials
    // at ~/.credentials/calendar-nodejs-quickstart.json
    const GOOGLE_AUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
    const { GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;
    const TOKEN_DIR = process.env.TOKEN_DIR || 'secrets';
    const TOKEN_PATH = `${process.cwd()}/${TOKEN_DIR}/${GOOGLE_SERVICE_ACCOUNT_JSON}`;

    try {
      log.debug({ TOKEN_PATH, GOOGLE_AUTH_SCOPES }, 'Creating JWT client');
      const jwtClient = new JWT({
        keyFile: TOKEN_PATH,
        scopes: GOOGLE_AUTH_SCOPES,
      });

      log.trace('Authorizing JWT client');
      await jwtClient.authorize();

      return jwtClient;
    } catch (err) {
      log.error({ err }, 'Error initializing google jwt auth client');
      throw err;
    }
  };

  const listEvents = async (auth) => new Promise((resolve, reject) => {
    const { GOOGLE_CALENDAR_ID } = process.env;
    const timeMin = (new Date()).toISOString();

    log.trace({ GOOGLE_CALENDAR_ID, timeMin }, 'Listing events');

    calendar.events.list({
      auth,
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin,
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
  const getCurrentEvent = async () => {
    log.trace('Getting current event');
    const auth = await getGoogleAuthClient();
    const events = await listEvents(auth);
    if (events.length === 0) {
      log.warn('No upcoming events found.');
      return null;
    }

    const event = events[0];

    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const utcStart = moment.utc(start);
    const utcEnd = moment.utc(end);

    if (!moment.utc().isBetween(utcStart, utcEnd)) {
      log.trace({ event }, 'Event is not in range');
      return null;
    }
    log.trace({ event }, 'Found event in time range');
    return event;
  };
  return {
    getCurrentEvent,
  };
};
