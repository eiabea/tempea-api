const chai = require('chai');

const { assert, expect } = chai;

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');
const nock = require('nock');

process.env.CI = 'true';

// Controller
const Auth = require('../../controller/auth.controller');
const Calendar = require('../../controller/calendar.controller');
const Relay = require('../../controller/relay.controller');

const SLAVE_HOST = 'mocked.tempea.com';
const SLAVE_PORT = 80;
const SLAVE_ENDPOINT = '/mocked';

// // Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../../controller/slave.controller')];

process.env.SLAVE_HOST = SLAVE_HOST;
process.env.SLAVE_PORT = SLAVE_PORT;
process.env.SLAVE_ENDPOINT = SLAVE_ENDPOINT;

const Slave = require('../../controller/slave.controller');
const Temp = require('../../controller/temp.controller');

const StatusRoute = require('../../routes/v1/status.route');

describe('Status Route', () => {
  let app;
  const controller = {};

  const mockedSlaveResponse = {
    success: true,
    data: {
      temp: 2.1,
      hum: 62,
    },
  };

  before(async () => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(200, mockedSlaveResponse);

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
    const { slave } = data;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isBoolean(data.heating);
    assert.isNumber(data.desiredTemp);
    assert.isNumber(data.currentTemp);
    assert.isDefined(slave);
    expect(slave.currentTemp).to.equal(mockedSlaveResponse.data.temp);
    expect(slave.currentHum).to.equal(mockedSlaveResponse.data.hum);
  });
});
