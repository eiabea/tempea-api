const express = require('express');
const router = express.Router();

module.exports = function(log) {
  this.log = log.child({route: 'status'});
  this.relay = require('../../controller/relay.controller')(log);
  this.temp = require('../../controller/temp.controller')(log);
  this.calendar = require('../../controller/calendar.controller')(log);
  this.auth = require('../../controller/auth.controller')(log);

  router.get('/', async (req, res) => {
    this.log.info('Got status request');
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: await this.calendar.getDesiredTemperature(),
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  router.get('/on', async (req, res) => {
    await this.relay.setRelay(1);
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: await this.calendar.getDesiredTemperature(),
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  router.get('/off', async (req, res) => {
    await this.relay.setRelay(0);
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: await this.calendar.getDesiredTemperature(),
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  router.get('/protect', this.auth.authenticate(), this.auth.authorize(), async (req, res) => {
    this.log.info('Got protect request');
    res.json({
      success: true
    });
  });

  return router;
};
