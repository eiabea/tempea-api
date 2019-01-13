const chai = require('chai');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const express = require('express');
const bodyParser = require('body-parser');
const log = require('null-logger');
const sinon = require('sinon');

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
const Cache = require('../../controller/cache.controller');
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
    controller.cache = Cache(log);
    controller.calendar = Calendar(log, controller.cache);
    controller.relay = Relay(log, controller.cache);
    controller.slave = Slave(log, controller.cache);
    controller.temp = Temp(log, controller.cache);

    // Populate cache with useful data
    await controller.cache.updateRelayState(0);
    await controller.cache.updateCurrentTemperature(18.4);
    await controller.cache.updateDesiredTemperature(19.4);
    await controller.cache.updateSlaveData(mockedSlaveResponse);

    app = express();

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(express.Router({ mergeParams: true }));

    app.use('/v1/status', StatusRoute(log, controller));
  });

  it('should get status', async () => {
    await controller.cache.updateSlaveData(mockedSlaveResponse);

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
    await controller.cache.updateSlaveData(undefined);

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
    await controller.cache.updateSlaveData(undefined);

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

  it('should get status [no desired]', async () => {
    const stub = sinon.stub(controller.cache, 'getDesiredTemperature')
      .throws(new Error('Mocked error'));

    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isUndefined(data.desiredTemp);

    stub.restore();
  });

  it('should get status [no relay]', async () => {
    const stub = sinon.stub(controller.cache, 'getRelayState')
      .throws(new Error('Mocked error'));

    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isUndefined(data.heating);

    stub.restore();
  });

  it('should get status [no current temperature]', async () => {
    const stub = sinon.stub(controller.cache, 'getCurrentTemperature')
      .throws(new Error('Mocked error'));

    const response = await chai.request(app).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isUndefined(data.currentTemp);

    stub.restore();
  });
});
