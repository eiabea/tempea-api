const express = require('express');
const router = express.Router();
const State = require('../../state');

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

  router.get('/', async (req, res) => {
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
        data: await getStatusObject()
      });
      break;
    default:
      res.json({
        success: false,
        data: await getStatusObject()
      });
      break;
    }
  });

  return router;
};
