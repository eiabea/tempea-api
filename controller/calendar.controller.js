const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const moment = require('moment');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
//   process.env.USERPROFILE) + '/.credentials/';
const TOKEN_DIR = `${process.cwd()}/auth/`;
const TOKEN_PATH = `${TOKEN_DIR}calendar-nodejs-quickstart.json`;
const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

module.exports = (log) => {
  /*
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
  const storeToken = (token) => {
    try {
      fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    log.trace(`Token stored to ${TOKEN_PATH}`);
  };

  /*
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
  const getNewToken = (oauth2Client, callback) => {
    const authUrl = oauth2Client.generateAuthUrl({
      // eslint-disable-next-line camelcase
      access_type: 'offline',
      scope: SCOPES,
    });
    log.info('Authorize this app by visiting this url: ', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oauth2Client.getToken(code, (err, token) => {
        if (err) {
          log.error({ err }, 'Error while trying to retrieve access token', err);
          return;
        }
        // eslint-disable-next-line no-param-reassign
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
      });
    });
  };

  /*
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
  const authorize = (credentials, callback) => {
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];
    // eslint-disable-next-line new-cap
    const auth = new googleAuth();
    const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) {
        getNewToken(oauth2Client, callback);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        callback(oauth2Client);
      }
    });
  };

  /*
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
  const getCurrentEvent = (auth, callback) => {
    const calendar = google.calendar('v3');
    calendar.events.list({
      auth,
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, response) => {
      if (err) {
        log.error({ err }, `The API returned an error: ${err}`);
        return;
      }
      const events = response.items;
      if (events.length === 0) {
        log.info('No upcoming events found.');
        callback(null);
      } else {
        const event = events[0];

        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        const utcStart = moment.utc(start);
        const utcEnd = moment.utc(end);

        if (moment().isBetween(utcStart, utcEnd)) {
          log.trace({ event }, 'Event is in range');
          callback(event);
        } else {
          log.trace({ event }, 'Event is not in range');
          callback(null);
        }
      }
    });
  };

  const getDesiredTemperature = () => new Promise((resolve, reject) => {
    log.trace('getDesiredTemperature');
    fs.readFile(`${process.cwd()}/auth/client_secret.json`, (err, content) => {
      if (err) {
        log.error({ err }, `Error loading client secret file: ${err}`);
        return reject(err);
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Calendar API.
      return authorize(JSON.parse(content), oauthClient => getCurrentEvent(oauthClient, (event) => {
        if (!event) {
          return resolve(MIN_TEMP);
        }

        let desiredTemp;
        try {
          desiredTemp = parseFloat(event.summary);
        } catch (e) {
          log.error({ e }, 'Unable to parse, fallback to MIN_TEMP');
          desiredTemp = MIN_TEMP;
        }

        if (desiredTemp > MAX_TEMP) {
          desiredTemp = MAX_TEMP;
        }

        return resolve(desiredTemp);
      }));
    });
  });

  return {
    getDesiredTemperature,
  };
};
