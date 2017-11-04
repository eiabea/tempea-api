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
const TOKEN_DIR = process.cwd() + '/auth/';
const TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

module.exports = (log)=> {
  this.log = log.child({controller: 'calendar'});
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
    this.log.trace('Token stored to ' + TOKEN_PATH);
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
    let authUrl = oauth2Client.generateAuthUrl({
      // eslint-disable-next-line camelcase
      access_type: 'offline',
      scope: SCOPES
    });
    this.log.info('Authorize this app by visiting this url: ', authUrl);
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', (code)=> {
      rl.close();
      oauth2Client.getToken(code, (err, token)=> {
        if (err) {
          this.log.error({err}, 'Error while trying to retrieve access token', err);
          return;
        }
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
  const authorize = (credentials, callback)=> {
    let clientSecret = credentials.installed.client_secret;
    let clientId = credentials.installed.client_id;
    let redirectUrl = credentials.installed.redirect_uris[0];
    // eslint-disable-next-line new-cap
    let auth = new googleAuth();
    let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token)=> {
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
    let calendar = google.calendar('v3');
    calendar.events.list({
      auth: auth,
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime'
    }, (err, response) => {
      if (err) {
        this.log.error({err}, 'The API returned an error: ' + err);
        return;
      }
      let events = response.items;
      if (events.length === 0) {
        this.log.info('No upcoming events found.');
        callback(null);
      } else {
        const event = events[0];

        let start = event.start.dateTime || event.start.date;
        let end = event.end.dateTime || event.end.date;
        const utcStart = moment.utc(start);
        const utcEnd = moment.utc(end);

        if (moment().isBetween(utcStart, utcEnd)) {
          this.log.info({event}, 'Event is in range');
          callback(event);
        } else {
          this.log.info({event}, 'Event is not in range');
          callback(null);
        }
      }
    });
  };

  const getDesiredTemperature = ()=>{
    return new Promise((resolve, reject)=>{
      this.log.trace('getDesiredTemperature');
      fs.readFile(process.cwd() + '/auth/client_secret.json', (err, content) => {
        if (err) {
          this.log.error({err}, 'Error loading client secret file: ' + err);
          return reject(err);
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        return authorize(JSON.parse(content), (oauthClient)=>{
          return getCurrentEvent(oauthClient, event=>{
            if (!event) {
              return resolve(MIN_TEMP);
            }

            let desiredTemp;
            try {
              desiredTemp = parseFloat(event.summary);
            } catch (e) {
              this.log.error({e}, 'Unable to parse, fallback to MIN_TEMP');
              desiredTemp = MIN_TEMP;
            }

            if (desiredTemp > MAX_TEMP) {
              desiredTemp = MAX_TEMP;
            }

            return resolve(desiredTemp);
          });
        });
      });
    });
  };

  return {
    getDesiredTemperature
  };
};
