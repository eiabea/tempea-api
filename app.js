const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const bunyan = require('bunyan');

// Controller
const Cache = require('./controller/cache.controller');
const Calendar = require('./controller/calendar.controller');
const Database = require('./controller/database.controller');
const Heat = require('./controller/heat.controller');
const Relay = require('./controller/relay.controller');
const Schedule = require('./controller/schedule.controller');
const Slave = require('./controller/slave.controller');
const Temp = require('./controller/temp.controller');

const State = require('./state');

// Routes
const StatusRoute = require('./routes/v1/status.route');

const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT, 10) || 3000;

module.exports = (loglevel) => {
  const log = bunyan.createLogger({
    name: 'tempea',
    level: loglevel,
    serializers: bunyan.stdSerializers,
  });

  let heating = false;
  let app;
  const controller = {};

  const initControllers = async () => {
    controller.cache = Cache(log.child({ controller: 'cache' }));
    controller.calendar = Calendar(log.child({ controller: 'calendar' }), controller.cache);
    controller.database = await Database(log.child({ controller: 'database' }));
    controller.heat = Heat(log.child({ controller: 'heat' }));
    controller.relay = Relay(log.child({ controller: 'relay' }), controller.cache);
    controller.schedule = Schedule(log.child({ controller: 'schedule' }));
    controller.slave = Slave(log.child({ controller: 'slave' }), controller.cache);
    controller.temp = Temp(log.child({ controller: 'temp' }), controller.cache);
  };

  const initExpress = async () => {
    log.info('Initializing routing module');

    app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cors());
    app.use(helmet());

    const router = express.Router({ mergeParams: true });

    app.use(router);

    app.use('/v1/status', StatusRoute(log.child({ route: 'status' }), controller));

    log.info(`Starting Backend on port ${EXPRESS_PORT}`);
    app.listen(EXPRESS_PORT, () => {
      log.info(`Backend listening on port ${EXPRESS_PORT}`);
    });
  };

  const job = async () => {
    let currentTemp;
    let desiredTemp;
    let slaveData;

    try {
      const rawSlaveData = await controller.slave.getData();
      slaveData = {
        temp: rawSlaveData.data.temp,
        hum: rawSlaveData.data.hum,
      };
    } catch (err) {
      log.error({ err }, 'Error getting slave data');
    }

    try {
      desiredTemp = await controller.calendar.getDesiredTemperature();
      currentTemp = await controller.temp.getCurrentTemp();
    } catch (err) {
      log.error({ err }, 'Error getting temperatures');
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
        log.error({ err }, 'Error setting relay');
      }
    } else {
      log.info('Tempea disabled, disable heating');
      try {
        await controller.relay.setRelay(0);
        heating = false;
      } catch (err) {
        log.error({ err }, 'Error setting relay');
      }
    }

    try {
      await controller.database
        .writeMeasurement(currentTemp, desiredTemp, heating, slaveData);
    } catch (err) {
      log.error({ err }, 'Error writing measurement');
    }
  };

  const getController = () => controller;
  const getExpressApp = () => app;

  const start = async () => {
    await initControllers();
    await initExpress();

    // Setting initial relay state
    await controller.cache.updateRelayState(0);

    controller.schedule.startJob(job);
  };

  return {
    start,
    getController,
    getExpressApp,
  };
};
