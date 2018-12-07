const express = require('express');

const router = express.Router();
const RateLimit = require('express-rate-limit');
const State = require('../../state');

const rateLimiterMode = new RateLimit({
  keyGenerator: req => req.header('x-real-ip') || req.connection.remoteAddress,
  windowMs: 5 * 60 * 1000,
  max: 100,
});

module.exports = (log, controller) => {
  router.post(
    '/',
    rateLimiterMode,
    controller.auth.authenticate(),
    controller.auth.authorize(),
    async (req, res) => {
      const { mode } = req.body;
      log.info({ mode }, 'Got mode request');

      switch (mode) {
        case 'automatic':
        case 'disable':
          State.mode = mode;
          res.json({
            success: true,
            data: {
              msg: `Successfully set mode to ${mode}`,
            },
          });
          break;
        default:
          res.json({
            success: false,
            error: {
              msg: 'Unknown mode',
            },
          });
          break;
      }
    },
  );

  router.get(
    '/',
    rateLimiterMode,
    controller.auth.authenticate(),
    controller.auth.authorize(),
    async (req, res) => {
      res.json({
        success: true,
        data: {
          mode: State.mode,
        },
      });
    },
  );

  return router;
};
