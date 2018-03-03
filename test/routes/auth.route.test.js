require('../Helper').invalidateNodeCache();

const chai = require('chai');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');

// Controller
const Auth = require('../../controller/auth.controller');

// Routes
const AuthRoute = require('../../routes/v1/auth.route');

describe('Auth Route', () => {
  let app;
  const controller = {};

  before(async () => {
    controller.auth = Auth(log);

    app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(express.Router({ mergeParams: true }));

    app.use('/v1/auth', AuthRoute(log, controller));
  });

  it('should login admin user', async () => {
    const response = await chai.request(app)
      .post('/v1/auth/login')
      .send({
        email: 'admin@tempea.com',
        password: 'changeMe',
      });
    const { body } = response;
    const { token } = body;

    assert.isString(token);
  });

  it('should fail to login [no body]', async () => {
    try {
      await chai.request(app)
        .post('/v1/auth/login');
    } catch (err) {
      expect(err.response.statusCode).to.equal(400);
    }
  });

  it('should fail to login [wrong email]', async () => {
    try {
      await chai.request(app)
        .post('/v1/auth/login')
        .send({
          email: 'wrong@tempea.com',
          password: 'changeMe',
        });
    } catch (err) {
      expect(err.response.statusCode).to.equal(401);
    }
  });

  it('should fail to login [wrong password]', async () => {
    try {
      await chai.request(app)
        .post('/v1/auth/login')
        .send({
          email: 'admin@tempea.com',
          password: 'wrong',
        });
    } catch (err) {
      expect(err.response.statusCode).to.equal(401);
    }
  });
});
