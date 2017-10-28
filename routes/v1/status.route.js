const express = require('express');
const router = express.Router();
const Temp = require('../../controller/temp.controller');

router.get('/', async (req, res)=>{
  res.json({
    heating: false,
    desiredTemp: 21,
    currentTemp: await Temp.getCurrentTemp()
  });
});

module.exports = router;
