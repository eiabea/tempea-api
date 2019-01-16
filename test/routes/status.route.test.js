const mockedEnv = require('mocked-env');
const chai = require('chai');

const { assert, expect } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const sinon = require('sinon');
const App = require('../../app');

describe('Status Route', () => {
  let restore;
  let expressApp;
  let controller;

  const mockedSlaveResponse = {
    success: true,
    data: {
      temp: 2.1,
      hum: 62,
    },
  };

  before(async () => {
    restore = mockedEnv({
      EXPRESS_PORT: '3001',
      SLAVE_HOST: 'mocked.tempea.com',
      SLAVE_PORT: '80',
      SLAVE_ENDPOINT: '/mocked',
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const app = App(60);
    await app.start();
    expressApp = app.getExpressApp();
    controller = app.getController();

    // Populate cache with useful data
    await controller.cache.updateRelayState(0);
    await controller.cache.updateCurrentTemperature(18.4);
    await controller.cache.updateDesiredTemperature(19.4);
    await controller.cache.updateSlaveData(mockedSlaveResponse);
  });

  after(async () => {
    restore();
  });

  it('should get status', async () => {
    await controller.cache.updateSlaveData(mockedSlaveResponse);

    const response = await chai.request(expressApp).get('/v1/status');
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

    const response = await chai.request(expressApp).get('/v1/status');
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

    const response = await chai.request(expressApp).get('/v1/status');
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

    const response = await chai.request(expressApp).get('/v1/status');
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

    const response = await chai.request(expressApp).get('/v1/status');
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

    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;

    assert.isTrue(body.success);
    assert.isString(data.mode);
    assert.isUndefined(data.currentTemp);

    stub.restore();
  });
});
