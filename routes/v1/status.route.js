const express = require('express');

const router = express.Router();
const State = require('../../state');
const RateLimit = require('express-rate-limit');

const rateLimiterStatus = new RateLimit({
  keyGenerator: req => req.header('x-real-ip') || req.connection.remoteAddress,
  windowMs: 5 * 60 * 1000,
  delayAfter: 100,
  delayMs: 50,
  max: 100,
});

module.exports = (log, controller) => {
  const getStatusObject = async () => {
    try {
      const slaveData = await controller.slave.getData();
      return {
        mode: State.mode,
        heating: await controller.relay.getRelay() === 1,
        desiredTemp: await controller.calendar.getDesiredTemperature(),
        currentTemp: await controller.temp.getCurrentTemp(),
        slave: {
          currentTemp: slaveData.data.temp,
          currentHum: slaveData.data.hum,
        },
      };
    } catch (err) {
      log.error({ err }, 'Error getting slave data', err);
      return {
        mode: State.mode,
        heating: await controller.relay.getRelay() === 1,
        desiredTemp: await controller.calendar.getDesiredTemperature(),
        currentTemp: await controller.temp.getCurrentTemp(),
      };
    }
  };

  router.get('/', rateLimiterStatus, async (req, res) => {
    log.info('Got status request');
    res.json({
      success: true,
      data: await getStatusObject(),
    });
  });

  // router.post('/mode', controller.auth.authenticate(),
  //  controller.auth.authorize(), async (req, res) => {
  //   const { mode } = req.body;
  //   log.info({ mode }, 'Got mode request');

  //   switch (mode) {
  //     case 'automatic':
  //     case 'disable':
  //       State.mode = mode;
  //       res.json({
  //         success: true,
  //         data: {
  //           msg: `Successfully set mode to ${mode}`,
  //         },
  //       });
  //       break;
  //     default:
  //       res.json({
  //         success: false,
  //         error: {
  //           msg: 'Unknown mode',
  //         },
  //       });
  //       break;
  //   }
  // });

  return router;
};
