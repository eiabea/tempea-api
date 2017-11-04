const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'tempea', level: 10});
const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const OVERSHOOT_TEMP = parseFloat(process.env.OVERSHOOT_TEMP) || 0.5;
const Auth = require('./controller/auth.controller')(log);
const Schedule = require('./controller/schedule.controller')(log);
const Temp = require('./controller/temp.controller')(log);
const Relay = require('./controller/relay.controller')(log);
const Calendar = require('./controller/calendar.controller')(log);
const Database = require('./controller/database.controller')(log);
const State = require('./state');

(async function() {
  this.heating = false;

  log.info('Initializing routing module');

  const app = express();

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cors());
  app.use(helmet());
  app.use(Auth.init());

  const router = express.Router({mergeParams: true});

  app.use(router);

  app.use('/v1/auth', require('./routes/v1/auth.route')(log));
  app.use('/v1/status', require('./routes/v1/status.route')(log));

  log.info(`Starting tempea backend on port ${EXPRESS_PORT}`);
  app.listen(EXPRESS_PORT, ()=> {
    log.info(`tempea backend listening on port ${EXPRESS_PORT}`);
  });

  Schedule.startJob(async ()=>{
    try {
      const currentTemp = await Temp.getCurrentTemp();
      const desiredTemp = await Calendar.getDesiredTemperature();
      if (State.mode === 'automatic') {
        if (desiredTemp < currentTemp &&
        currentTemp < desiredTemp + OVERSHOOT_TEMP &&
        !this.heating) {
          log.info({
            currentTemp,
            desiredTemp,
            overshoot: OVERSHOOT_TEMP},
          'Room temperature in range, disable heating');
          try {
            await Relay.setRelay(0);
          } catch (err) {
            log.error({err}, 'Error setting relay', err);
          }
        } else if (currentTemp < desiredTemp + OVERSHOOT_TEMP) {
          log.info({
            currentTemp,
            desiredTemp,
            overshoot: OVERSHOOT_TEMP
          },
          'Room temperature too low, ensure heating');
          try {
            await Relay.setRelay(1);
            this.heating = true;
          } catch (err) {
            log.error({err}, 'Error setting relay', err);
          }
        } else {
          log.info({
            currentTemp,
            desiredTemp,
            overshoot: OVERSHOOT_TEMP},
          'Room temperature high enough, disabling heating');
          try {
            await Relay.setRelay(0);
            this.heating = false;
          } catch (err) {
            log.error({err}, 'Error setting relay', err);
          }
        }
      } else {
        log.info('Tempea disabled, disable heating');
        try {
          await Relay.setRelay(0);
          this.heating = false;
        } catch (err) {
          log.error({err}, 'Error setting relay', err);
        }
      }

      try {
        await Database.writeMeasurement(currentTemp, desiredTemp, this.heating);
      } catch (err) {
        log.error({err}, 'Error writing measurement', err);
      }
    } catch (err) {
      log.error({err}, 'Error getting temperatures', err);
    }
  });
}());
