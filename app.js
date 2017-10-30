const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'tempea', level: 10});
const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const OVERSHOOT_TEMP = parseFloat(process.env.OVERSHOOT_TEMP) || 0.5;
const StatusRoute = require('./routes/v1/status.route')(log);
const Schedule = require('./controller/schedule.controller')(log);
const Temp = require('./controller/temp.controller')(log);
const Relay = require('./controller/relay.controller')(log);
const Calendar = require('./controller/calendar.controller')(log);

(async function() {
  log.info('Initializing routing module');

  const app = express();

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cors());
  app.use(helmet());

  const router = express.Router({mergeParams: true});

  app.use(router);

  app.use('/v1/status', StatusRoute);

  log.info(`Starting tempea backend on port ${EXPRESS_PORT}`);
  app.listen(EXPRESS_PORT, ()=> {
    log.info(`tempea backend listening on port ${EXPRESS_PORT}`);
  });

  this.heating = false;

  Schedule.startJob(async ()=>{
    const currentTemp = await Temp.getCurrentTemp();
    const desiredTemp = await Calendar.getDesiredTemperature();

    // currentTemp < desiredTemp + OVERSHOOT_TEMP --> aufheizen
    // desiredTemp < currentTemp < desiredTemp + OVERSHOOT_TEMP --> nicht aufheizen

    console.log(desiredTemp < currentTemp &&
      currentTemp < (desiredTemp + OVERSHOOT_TEMP) &&
      !this.heating)

    if (desiredTemp < currentTemp &&
      currentTemp < (desiredTemp + OVERSHOOT_TEMP) &&
      !this.heating) {
      // Passt
      log.info({
        currentTemp,
        desiredTemp,
        overshoot: OVERSHOOT_TEMP},
      'Room temperature in range, disable heating');
      await Relay.setRelay(0);
    } else if (currentTemp < desiredTemp + OVERSHOOT_TEMP) {
      // Heizen
      log.info({
        currentTemp,
        desiredTemp,
        overshoot: OVERSHOOT_TEMP
      },
      'Room temperature too low, ensure heating');
      await Relay.setRelay(1);
      this.heating = true;
    } else {
      // Fallback
      log.info({
        currentTemp,
        desiredTemp,
        overshoot: OVERSHOOT_TEMP},
      'Room temperature high enough, disabling heating');
      await Relay.setRelay(0);
      this.heating = false;
    }


    // if (currentTemp < desiredTemp + OVERSHOOT_TEMP) {
    //   log.info({
    //       currentTemp,
    //       desiredTemp,
    //       overshoot: OVERSHOOT_TEMP
    //     },
    //     'Room temperature too low, ensure heating');
    //   await Relay.setRelay(1);
    // } else if(desiredTemp < currentTemp < desiredTemp + OVERSHOOT_TEMP){
    //   log.info({
    //       currentTemp,
    //       desiredTemp,
    //       overshoot: OVERSHOOT_TEMP},
    //     'Room temperature high enough, disabling heating');
    //   await Relay.setRelay(0);
    // } else {
    //   log.info({
    //     currentTemp,
    //     desiredTemp,
    //     overshoot: OVERSHOOT_TEMP},
    //   'Weird temperature, disabling heating');
    //   await Relay.setRelay(0);
    // }
  });
}());
