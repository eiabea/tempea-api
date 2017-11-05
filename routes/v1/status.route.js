const express = require('express');
const router = express.Router();
const State = require('../../state');
const RateLimit = require('express-rate-limit');
const rateLimiterStatus = new RateLimit({
  keyGenerator: (req) => {
    return req.header('x-real-ip') || req.connection.remoteAddress;
  },
  windowMs: 5 * 60 * 1000,
  delayAfter: 100,
  delayMs: 50,
  max: 100
});

module.exports = (log) => {
  this.log = log.child({route: 'status'});
  this.relay = require('../../controller/relay.controller')(log);
  this.temp = require('../../controller/temp.controller')(log);
  this.calendar = require('../../controller/calendar.controller')(log);
  this.auth = require('../../controller/auth.controller')(log);

  const getStatusObject = async ()=>{
    return {
      mode: State.mode,
      heating: await this.relay.getRelay() === 1,
      desiredTemp: await this.calendar.getDesiredTemperature(),
      currentTemp: await this.temp.getCurrentTemp()
    };
  };

  router.get('/', rateLimiterStatus, async (req, res) => {
    this.log.info('Got status request');
    res.json({
      success: true,
      data: await getStatusObject()
    });
  });

  router.post('/mode', this.auth.authenticate(), this.auth.authorize(), async (req, res) => {
    const {mode} = req.body;
    this.log.info({mode}, 'Got mode request');

    switch (mode) {
    case 'automatic':
    case 'disable':
      State.mode = mode;
      res.json({
        success: true,
        data: {
          msg: 'Successfully set mode to ' + mode
        }
      });
      break;
    default:
      res.json({
        success: false,
        error: {
          msg: 'Unknown mode'
        }
      });
      break;
    }
  });

  return router;
};
