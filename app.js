const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const bunyan = require('bunyan');

// Controller
const Auth = require('./controller/auth.controller');
const Calendar = require('./controller/calendar.controller');
const Database = require('./controller/database.controller');
const Heat = require('./controller/heat.controller');
const Relay = require('./controller/relay.controller');
const Schedule = require('./controller/schedule.controller');
const Slave = require('./controller/slave.controller');
const Temp = require('./controller/temp.controller');

const State = require('./state');

// Routes
const AuthRoute = require('./routes/v1/auth.route');
const StatusRoute = require('./routes/v1/status.route');

const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT, 10) || 3000;

(async function tempea() {
  const log = bunyan.createLogger({ name: 'tempea', level: 10 });

  let heating = false;
  const controller = {};

  const initControllers = () => {
    controller.auth = Auth(log.child({ controller: 'auth' }));
    controller.calendar = Calendar(log.child({ controller: 'calendar' }));
    controller.database = Database(log.child({ controller: 'database' }));
    controller.heat = Heat(log.child({ controller: 'heat' }));
    controller.relay = Relay(log.child({ controller: 'relay' }));
    controller.schedule = Schedule(log.child({ controller: 'schedule' }));
    controller.slave = Slave(log.child({ controller: 'slave' }));
    controller.temp = Temp(log.child({ controller: 'temp' }));
  };

  const initExpress = () => {
    log.info('Initializing routing module');

    const app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cors());
    app.use(helmet());
    app.use(controller.auth.getAclMiddleware());

    const router = express.Router({ mergeParams: true });

    app.use(router);

    app.use('/v1/auth', AuthRoute(log.child({ route: 'auth' }), controller));
    app.use('/v1/status', StatusRoute(log.child({ route: 'status' }), controller));

    log.info(`Starting Backend on port ${EXPRESS_PORT}`);
    app.listen(EXPRESS_PORT, () => {
      log.info(`Backend listening on port ${EXPRESS_PORT}`);
    });
  };

  initControllers();
  initExpress();

  controller.schedule.startJob(async () => {
    let currentTemp;
    let desiredTemp;
    let slaveData;

    try {
      currentTemp = await controller.temp.getCurrentTemp();
      desiredTemp = await controller.calendar.getDesiredTemperature();
    } catch (err) {
      log.error({ err }, 'Error getting temperatures', err);
      log.info('Disable heating');
      try {
        await controller.relay.setRelay(0);
        heating = false;
      } catch (disableErr) {
        log.error({ disableErr }, 'Error setting relay', disableErr);
      }
      return;
    }

    if (State.mode === 'automatic') {
      const enableHeating = controller.heat.shouldHeat(currentTemp, desiredTemp, heating);

      try {
        await controller.relay.setRelay(enableHeating ? 1 : 0);
        heating = enableHeating;
      } catch (err) {
        log.error({ err }, 'Error setting relay', err);
      }
    } else {
      log.info('Tempea disabled, disable heating');
      try {
        await controller.relay.setRelay(0);
        heating = false;
      } catch (err) {
        log.error({ err }, 'Error setting relay', err);
      }
    }

    try {
      const rawSlaveData = await controller.slave.getData();
      slaveData = {
        temp: rawSlaveData.data.temp,
        hum: rawSlaveData.data.hum,
      };
    } catch (err) {
      log.error({ err }, 'Error getting slave data', err);
    }

    try {
      await controller.database
        .writeMeasurement(currentTemp, desiredTemp, heating, slaveData);
    } catch (err) {
      log.error({ err }, 'Error writing measurement', err);
    }
  });
}());
