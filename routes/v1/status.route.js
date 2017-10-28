const express = require('express');
const router = express.Router();
const Temp = require('../../controller/temp.controller');
const Relay = require('../../controller/relay.controller');

router.get('/', async (req, res)=>{
  res.json({
    heating: await Relay.getRelay() === 1,
    desiredTemp: 21,
    currentTemp: await Temp.getCurrentTemp()
  });
});

router.get('/on', async (req, res)=>{
  await Relay.setRelay(1);
  res.json({
    heating: await Relay.getRelay() === 1,
    desiredTemp: 21,
    currentTemp: await Temp.getCurrentTemp()
  });
});

router.get('/off', async (req, res)=>{
  await Relay.setRelay(0);
  res.json({
    heating: await Relay.getRelay() === 1,
    desiredTemp: 21,
    currentTemp: await Temp.getCurrentTemp()
  });
});

module.exports = router;
