const chai = require('chai');

const { assert } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');

process.env.CI = 'true';

// Controller
const Auth = require('../../controller/auth.controller');
const Calendar = require('../../controller/calendar.controller');
const Relay = require('../../controller/relay.controller');
const Slave = require('../../controller/slave.controller');
const Temp = require('../../controller/temp.controller');

const StatusRoute = require('../../routes/v1/status.route');

describe('Status Route', () => {
  let app;
  const controller = {};

  before(async () => {
    controller.auth = Auth(log);
    controller.calendar = Calendar(log);
    controller.relay = Relay(log);
    controller.slave = Slave(log);
    controller.temp = Temp(log);

    app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(express.Router({ mergeParams: true }));

    app.use('/v1/status', StatusRoute(log, controller));
  });

  it('get status', async () => {
    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isBoolean(data.heating);
    assert.isNumber(data.desiredTemp);
    assert.isNumber(data.currentTemp);
  });
});
