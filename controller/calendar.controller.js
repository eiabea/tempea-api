const fs = require('fs');
const { JWT } = require('google-auth-library');
const calendar = require('googleapis').calendar('v3');
// const googleAuth = require('google-auth-library');
// const { OAuth2Client } = require('google-auth-library');
const moment = require('moment');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
//   process.env.USERPROFILE) + '/.credentials/';
const TOKEN_DIR = `${process.cwd()}/secrets`;
// const TOKEN_PATH = `${TOKEN_DIR}/calendar-nodejs-quickstart.json`;
const TOKEN_PATH = `${TOKEN_DIR}/tempea-service.json`;
// const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
// const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

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
      const tokenContent = await getServiceJson();

      const jwtClient = new JWT(
        tokenContent.client_email,
        null,
        tokenContent.private_key,
        SCOPES,
      );

      await jwtClient.authorize();

      return jwtClient;
    } catch (err) {
      log.error({ err }, 'Error initializing google jwt auth client', err);
      throw err;
    }

    // // Check if we have previously stored a token.
    // fs.readFile(TOKEN_PATH, async (err, token) => {
    //   if (err) {
    //     return reject(err);
    //   }

    //   const tokenContent = JSON.parse(token);

    //   jwtClient = new JWT(
    //     tokenContent.client_email,
    //     null,
    //     tokenContent.private_key,
    //     SCOPES,
    //   );

    //   await jwtClient.authorize();

    //   console.log(jwtClient);

    //   return resolve(jwtClient);
    // });
  };

  /*
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
  // const storeToken = (token) => {
  //   try {
  //     fs.mkdirSync(TOKEN_DIR);
  //   } catch (err) {
  //     if (err.code !== 'EEXIST') {
  //       throw err;
  //     }
  //   }
  //   fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  //   log.trace(`Token stored to ${TOKEN_PATH}`);
  // };

  /*
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
  // const getNewToken = (oauth2Client, callback) => {
  //   const authUrl = oauth2Client.generateAuthUrl({
  //     // eslint-disable-next-line camelcase
  //     access_type: 'offline',
  //     scope: SCOPES,
  //   });
  //   log.info('Authorize this app by visiting this url: ', authUrl);
  //   const rl = readline.createInterface({
  //     input: process.stdin,
  //     output: process.stdout,
  //   });
  //   rl.question('Enter the code from that page here: ', (code) => {
  //     rl.close();
  //     oauth2Client.getToken(code, (err, token) => {
  //       if (err) {
  //         log.error({ err }, 'Error while trying to retrieve access token', err);
  //         return;
  //       }
  //       // eslint-disable-next-line no-param-reassign
  //       oauth2Client.credentials = token;
  //       storeToken(token);
  //       callback(oauth2Client);
  //     });
  //   });
  // };

  /*
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
  // const authorize = credentials => new Promise((resolve, reject) => {
  //   // const clientSecret = credentials.installed.client_secret;
  //   // const clientId = credentials.installed.client_id;
  //   // const redirectUrl = credentials.installed.redirect_uris[0];
  //   // const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);

  //   // // Check if we have previously stored a token.
  //   // fs.readFile(TOKEN_PATH, (err, token) => {
  //   //   if (err) {
  //   //     return reject(err);
  //   //   }

  //   //   oauth2Client.credentials = JSON.parse(token);
  //   //   return resolve(oauth2Client);
  //   // });

  // });

  const listEvents = async auth => new Promise((resolve, reject) => {
    calendar.events.list({
      auth,
      calendarId: 'developer@eiabea.com',
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
    // const url = `https://www.googleapis.com/calendar/v3/calendars/developer@eiabea.com/events/?timeMin=${(new Date()).toISOString()}&maxResults=1&singleEvents=true&orderBy=startTime`;
    // auth.request({ url })
    //   .then((response) => {
    //     // console.log(response);
    //     const events = response.data.items;
    //     if (events.length === 0) {
    //       log.info('No upcoming events found.');
    //       callback(null);
    //     } else {
    //       const event = events[0];

    //       const start = event.start.dateTime || event.start.date;
    //       const end = event.end.dateTime || event.end.date;
    //       const utcStart = moment.utc(start);
    //       const utcEnd = moment.utc(end);

    //       if (moment().isBetween(utcStart, utcEnd)) {
    //         log.trace({ event }, 'Event is in range');
    //         callback(event);
    //       } else {
    //         log.trace({ event }, 'Event is not in range');
    //         callback(null);
    //       }
    //     }
    //   });

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

  const getDesiredTemperature = () => new Promise((/* resolve, reject */) => {
    log.trace('getDesiredTemperature');
    // fs.readFile(`${process.cwd()}/auth/client_secret.json`, async (err, content) => {
    //   if (err) {
    //     log.error({ err }, `Error loading client secret file: ${err}`);
    //     return reject(err);
    //   }
    //   // Authorize a client with the loaded credentials, then call the
    //   // Google Calendar API.

    //   // const oauthClient = await getAuthenticatedClient(JSON.parse(content));

    //   return getCurrentEvent(null, (event) => {
    //     if (!event) {
    //       return resolve(MIN_TEMP);
    //     }

    //     let desiredTemp;
    //     try {
    //       desiredTemp = parseFloat(event.summary);
    //     } catch (e) {
    //       log.error({ e }, 'Unable to parse, fallback to MIN_TEMP');
    //       desiredTemp = MIN_TEMP;
    //     }

    //     if (desiredTemp > MAX_TEMP) {
    //       desiredTemp = MAX_TEMP;
    //     }

    //     return resolve(desiredTemp);
    //   });
    // });
  });

  getGoogleAuthClient().then((jwtClient) => {
    getCurrentEvent(jwtClient).then((event) => {
      console.log(event);
    });


    // const url = `https://www.googleapis.com/calendar/v3/calendars/developer@eiabea.com/events/?timeMin=${(new Date()).toISOString()}&maxResults=1&singleEvents=true&orderBy=startTime`;
    // jwtClient.request({ url })
    //   .then((res) => {
    //   });

    // getDesiredTemperature();
  });

  return {
    getDesiredTemperature,
  };
};
