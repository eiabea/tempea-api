require('../Helper').invalidateNodeCache();

const chai = require('chai');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');
const nock = require('nock');
const moment = require('moment');

const GOOGLE_CALENDAR_ID = '1337';
const SLAVE_HOST = 'mocked.tempea.com';
const SLAVE_PORT = 80;
const SLAVE_ENDPOINT = '/mocked';

process.env.SLAVE_HOST = SLAVE_HOST;
process.env.SLAVE_PORT = SLAVE_PORT;
process.env.SLAVE_ENDPOINT = SLAVE_ENDPOINT;
process.env.CI = 'true';
process.env.TOKEN_DIR = 'test/secrets';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'tempea-mocked.json';
process.env.GOOGLE_CALENDAR_ID = GOOGLE_CALENDAR_ID;

// Controller
const Auth = require('../../controller/auth.controller');
const Calendar = require('../../controller/calendar.controller');
const Relay = require('../../controller/relay.controller');
const Temp = require('../../controller/temp.controller');
const Slave = require('../../controller/slave.controller');

// Routes
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
    nock('https://www.googleapis.com:443')
      .post('/oauth2/v4/token')
      .times(3)
      .reply(200, {
        access_token: '1/fFAGRNJru1FTz70BzhT3Zg',
        expires_in: 3920,
        token_type: 'Bearer',
        refresh_token: '1/xEoDL4iW3cxlI7yDbSRFYNG01kVKM2C-259HOF2aQbI',
      });
    nock('https://www.googleapis.com:443')
      .get(new RegExp(`/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events/*`))
      .times(3)
      .reply(200, {
        items: [
          {
            summary: '18.4',
            start: {
              dateTime: moment().subtract(1, 'days').valueOf(),
            },
            end: {
              dateTime: moment().add(1, 'days').valueOf(),
            },
          },
        ],
      });

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

  it('should get status', async () => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(200, mockedSlaveResponse);

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

  it('should get status [no slave]', async () => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(404);

    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isBoolean(data.heating);
    assert.isNumber(data.desiredTemp);
    assert.isNumber(data.currentTemp);
    assert.isUndefined(slave);
  });

  it('should get status [faulty slave]', async () => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(500);

    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { slave } = data;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isBoolean(data.heating);
    assert.isNumber(data.desiredTemp);
    assert.isNumber(data.currentTemp);
    assert.isUndefined(slave);
  });
});
