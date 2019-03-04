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
    // Must not be defined outside of the function to ensure correct process.env
    const IS_MASTER = process.env.TEMPEA_SLAVE !== 'true';
    const returnObj = {};

    if (IS_MASTER) {
      returnObj.master = {};
      try {
        returnObj.slave = await controller.cache.getSlaveData();
      } catch (err) {
        log.error({ err }, 'Error getting slave data');
      }

      try {
        returnObj.mqtt = await controller.cache.getMqttData();
      } catch (err) {
        log.error({ err }, 'Error getting mqtt data');
      }

      try {
        returnObj.desired = await controller.cache.getDesiredObject();
      } catch (err) {
        log.error({ err }, 'Error getting calendar data');
      }

      try {
        const relayData = await controller.cache.getRelayState();
        returnObj.master.heating = relayData === 1;
      } catch (err) {
        log.error({ err }, 'Error getting relay data');
      }

      try {
        returnObj.master.temp = await controller.cache.getCurrentTemperature();
      } catch (err) {
        log.error({ err }, 'Error getting temperature data');
      }

      try {
        returnObj.master.updated = await controller.cache.getMasterUpdated();
      } catch (err) {
        log.error({ err }, 'Error getting master updated data');
      }
    } else {
      returnObj.temp = await controller.temp.getCurrentTemp();
    }

    return returnObj;
  };

  router.get('/', rateLimiterStatus, async (req, res) => {
    log.info('Got status request');
    try {
      const statusObject = await getStatusObject();
      res.json({
        success: true,
        data: statusObject,
      });
    } catch (err) {
      log.error({ err }, 'Error getting status object');
      res.json({
        success: false,
        message: err.message,
      });
    }
  });

  return router;
};
