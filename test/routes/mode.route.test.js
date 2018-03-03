require('../Helper').invalidateNodeCache();

const fs = require('fs');
const chai = require('chai');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');

const USERS_FILE = process.env.USERS_FILE || 'users.json';
const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

// Controller
const Auth = require('../../controller/auth.controller');

// Routes
const AuthRoute = require('../../routes/v1/auth.route');
const ModeRoute = require('../../routes/v1/mode.route');

describe('Mode Route', () => {
  let app;
  let adminToken;
  const controller = {};

  before(async () => {
    controller.auth = Auth(log);

    app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(express.Router({ mergeParams: true }));

    app.use('/v1/auth', AuthRoute(log, controller));
    app.use('/v1/mode', ModeRoute(log, controller));

    controller.auth.getAcl().allow('testGroup', '/v1/mode', ['post', 'get']);
    controller.auth.getAcl().addUserRoles(users[0].guid, 'testGroup');

    const response = await chai.request(app)
      .post('/v1/auth/login')
      .send({
        email: 'admin@tempea.com',
        password: 'changeMe',
      });
    adminToken = response.body.token;
  });

  it('should set \'disable\' mode', async () => {
    const response = await chai.request(app)
      .post('/v1/mode')
      .set('Authorization', `JWT ${adminToken}`)
      .send({
        mode: 'disable',
      });
    const { body } = response;

    assert.isTrue(body.success);
    assert.isString(body.data.msg);
  });

  it('should get \'disable\' mode', async () => {
    const response = await chai.request(app)
      .get('/v1/mode')
      .set('Authorization', `JWT ${adminToken}`);
    const { body } = response;

    assert.isTrue(body.success);
    expect(body.data.mode).to.equal('disable');
  });

  it('should fail to set \'unknown\' mode', async () => {
    const response = await chai.request(app)
      .post('/v1/mode')
      .set('Authorization', `JWT ${adminToken}`)
      .send({
        mode: 'unknown',
      });
    const { body } = response;

    assert.isFalse(body.success);
    assert.isString(body.error.msg);
  });
});
