const express = require('express');

const router = express.Router();
const RateLimit = require('express-rate-limit');
const State = require('../../state');

const rateLimiterStatus = new RateLimit({
  keyGenerator: req => req.header('x-real-ip') || req.connection.remoteAddress,
  windowMs: 5 * 60 * 1000,
  max: 100,
});

module.exports = (log, controller) => {
  const getStatusObject = async () => {
    const returnObj = {
      mode: State.mode,
    };

    try {
      const slaveData = await controller.slave.getData();
      returnObj.slave = {
        currentTemp: slaveData.data.temp,
        currentHum: slaveData.data.hum,
      };
    } catch (err) {
      log.error({ err }, 'Error getting slave data');
    }

    try {
      const relayData = await controller.relay.getRelay();
      returnObj.heating = relayData === 1;
    } catch (err) {
      log.error({ err }, 'Error getting relay data');
    }

    try {
      returnObj.desiredTemp = await controller.calendar.getDesiredTemperature();
    } catch (err) {
      log.error({ err }, 'Error getting calendar data');
    }

    try {
      returnObj.currentTemp = await controller.temp.getCurrentTemp();
    } catch (err) {
      log.error({ err }, 'Error getting temperature data');
    }

    return returnObj;
  };

  router.get('/', rateLimiterStatus, async (req, res) => {
    log.info('Got status request');
    try {
      res.json({
        success: true,
        data: await getStatusObject(),
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.message,
      });
    }
  });

  return router;
};
