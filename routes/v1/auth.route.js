const express = require('express');

const router = express.Router();
const RateLimit = require('express-rate-limit');

const rateLimiterLogin = new RateLimit({
  keyGenerator: req => req.header('x-real-ip') || req.connection.remoteAddress,
  windowMs: 5 * 60 * 1000,
  delayAfter: 100,
  delayMs: 50,
  max: 100,
});

module.exports = (log, controller) => {
  router.post('/login', rateLimiterLogin, async (req, res) => {
    const { email, password } = req.body;

    log.info({ user: email }, 'Got login request');

    if (!email || !password) {
      return res.sendStatus(400);
    }

    const user = await controller.auth.checkUserPassword(email, password);

    if (!user) {
      return res.sendStatus(401);
    }

    const payload = {
      guid: user.guid,
    };

    return res.json({
      token: controller.auth.signJWT(payload),
    });
  });

  return router;
};
