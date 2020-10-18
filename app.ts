const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
import * as bunyan from 'bunyan';
import { CacheController } from './controller/cache.controller';

// Controller
const Calendar = require('./controller/calendar.controller');
const Database = require('./controller/database.controller');
const Heat = require('./controller/heat.controller');
const Relay = require('./controller/relay.controller');
const Schedule = require('./controller/schedule.controller');
const Slave = require('./controller/slave.controller');
const Temp = require('./controller/temp.controller');

// Routes
const StatusRoute = require('./routes/v1/status.route');

const EXPRESS_PORT: Number = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const IS_MASTER: Boolean = process.env.TEMPEA_SLAVE !== 'true';
const SLAVE_ENABLED: Boolean = process.env.SLAVE_ENABLED === 'true';

module.exports = (loglevel) => {
  const log: bunyan = bunyan.createLogger({
    name: 'tempea',
    level: loglevel,
    serializers: bunyan.stdSerializers,
  } as bunyan.LoggerOptions);

  let heating: Boolean = false;
  let server;
  let app;
  const controller = {
    cache: null,
    temp: null,
    calendar: null,
    database: null,
    heat: null,
    relay: null,
    schedule: null,
    slave: null,
  };

  const initControllers = async () => {
    log.trace('Initializing general controller');
    controller.cache = new CacheController(log.child({ controller: 'cache' }));
    controller.temp = Temp(log.child({ controller: 'temp' }), controller.cache);
    if (IS_MASTER) {
      log.trace('Initializing master controller');
      controller.calendar = Calendar(log.child({ controller: 'calendar' }), controller.cache);
      controller.database = await Database(log.child({ controller: 'database' }), controller.cache);
      controller.heat = Heat(log.child({ controller: 'heat' }));
      controller.relay = Relay(log.child({ controller: 'relay' }), controller.cache);
      controller.schedule = Schedule(log.child({ controller: 'schedule' }));
    }
    if (SLAVE_ENABLED) {
      log.trace('Initializing slave controller');
      controller.slave = Slave(log.child({ controller: 'slave' }), controller.cache);
    }
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
    server = app.listen(EXPRESS_PORT, () => {
      log.info(`Backend listening on port ${EXPRESS_PORT}`);
    });
  };

  const getDesiredTemperature = (desiredObj, slaveData, masterTemp) => {
    let validSlaveData;
    let { master, slave } = desiredObj;
    if (!slaveData) {
      slave = 0;
      master = 100;
      validSlaveData = {
        // will be multiplied by 0, so irrelevant
        temp: 1337,
        // won't be taken into account
        hum: 0,
      };
    } else {
      validSlaveData = slaveData;
    }

    return (masterTemp * (master / 100)) + (validSlaveData.temp * (slave / 100));
  };

  const job = async () => {
    let prioTemp;
    let currentTemp;
    let desiredTemp;
    let slaveData;

    if (SLAVE_ENABLED) {
      try {
        slaveData = await controller.slave.getData();
      } catch (err) {
        log.error({ err }, 'Error getting slave data');
      }
    }

    try {
      // Currently only used to update cache
      await controller.database.getLatestMqttEntry();
    } catch (err) {
      log.error({ err }, 'Error getting mqtt data');
    }

    try {
      const desiredObj = await controller.calendar.getDesiredObject();
      currentTemp = await controller.temp.getCurrentTemp();

      prioTemp = getDesiredTemperature(
        desiredObj,
        slaveData,
        currentTemp,
      );
      desiredTemp = desiredObj.temp;
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

    const enableHeating = controller.heat.shouldHeat(prioTemp, desiredTemp, heating);

    try {
      await controller.relay.setRelay(enableHeating ? 1 : 0);
      heating = enableHeating;
    } catch (err) {
      log.error({ err }, 'Error setting relay');
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
    log.debug({ EXPRESS_PORT, IS_MASTER, SLAVE_ENABLED }, 'Starting tempea');
    await initControllers();
    await initExpress();

    if (IS_MASTER) {
      // Setting initial relay state
      await controller.cache.updateRelayState(0);

      controller.schedule.startJob(job);
    }
  };

  const stop = async () => {
    if (server) {
      server.close();
    }
  };

  const stopJob = async () => {
    if (IS_MASTER) {
      await controller.schedule.stopJob();
    }
  };

  const forceJob = async () => {
    await job();
  };

  return {
    start,
    stop,
    forceJob,
    stopJob,
    getController,
    getExpressApp,
  };
};
