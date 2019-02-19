const express = require('express');

const router = express.Router();
const RateLimit = require('express-rate-limit');

const rateLimiterStatus = new RateLimit({
  keyGenerator: req => req.header('x-real-ip') || req.connection.remoteAddress,
  windowMs: 5 * 60 * 1000,
  max: 100,
});

module.exports = (log, controller) => {
  const getStatusObject = async () => {
    const returnObj = {};

    try {
      const slaveData = await controller.cache.getSlaveData();
      returnObj.slave = {
        currentTemp: slaveData.data.temp,
        currentHum: slaveData.data.hum,
      };
    } catch (err) {
      log.error({ err }, 'Error getting slave data');
    }

    try {
      const mqttData = await controller.cache.getMqttData();
      returnObj.mqtt = mqttData;
    } catch (err) {
      log.error({ err }, 'Error getting mqtt data');
    }

    try {
      const relayData = await controller.cache.getRelayState();
      returnObj.heating = relayData === 1;
    } catch (err) {
      log.error({ err }, 'Error getting relay data');
    }

    try {
      returnObj.desiredTemp = await controller.cache.getDesiredTemperature();
    } catch (err) {
      log.error({ err }, 'Error getting calendar data');
    }

    try {
      returnObj.currentTemp = await controller.cache.getCurrentTemperature();
    } catch (err) {
      log.error({ err }, 'Error getting temperature data');
    }

    return returnObj;
  };

  router.get('/', rateLimiterStatus, async (req, res) => {
    log.info('Got status request');
    res.json({
      success: true,
      // getStatusObject can not throw, so no need for try/catch
      data: await getStatusObject(),
    });
  });

  return router;
};
