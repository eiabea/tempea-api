const express = require('express');
const router = express.Router();

module.exports = function(log) {
  this.log = log.child({route: 'auth'});
  this.auth = require('../../controller/auth.controller')(log);

  router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    this.log.info({user: email}, 'Got login request');

    if (!email || !password) {
      return res.sendStatus(400);
    }

    const user = await this.auth.checkUserPassword(email, password);

    if (!user) {
      return res.sendStatus(401);
    }

    let payload = {
      guid: user.guid
    };

    return res.json({
      token: this.auth.signJWT(payload)
    });
  });


  return router;
};
