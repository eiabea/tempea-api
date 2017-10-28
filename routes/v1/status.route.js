const express = require('express');
const router = express.Router();

module.exports = function(log) {
  this.log = log;
  // TODO find out a better way to log
  // relay child logger overrides temp logger
  this.relay = require('../../controller/relay.controller')(log.child({controller: 'relay'}));
  this.temp = require('../../controller/temp.controller')(log.child({controller: 'temp'}));

  router.get('/', async (req, res) => {
    this.log.info('Got status request');
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: 21,
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  router.get('/on', async (req, res) => {
    await this.relay.setRelay(1);
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: 21,
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  router.get('/off', async (req, res) => {
    await this.relay.setRelay(0);
    res.json({
      heating: await this.relay.getRelay() === 1,
      desiredTemp: 21,
      currentTemp: await this.temp.getCurrentTemp()
    });
  });

  return router;
};
