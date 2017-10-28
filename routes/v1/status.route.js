const express = require("express");
const router = express.Router();

router.get("/", (req, res)=>{
  res.json({
    heating: false,
    desiredTemp: 21,
    currentTemp: 22,
  })
})

module.exports = router;