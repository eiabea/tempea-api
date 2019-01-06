const mockedEnv = require('mocked-env');

const log = require('null-logger');
const { expect } = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const INFLUX_HOST = process.env.INFLUX_HOST || 'influx';
const INFLUX_PORT = process.env.INFLUX_PORT || 8086;

const DatabaseController = require('../../controller/database.controller');

describe('Database Controller', () => {
  before(() => {
    nock(`http://${INFLUX_HOST}:${INFLUX_PORT}`)
      .post(/.*/g)
      .times(8)
      .reply(200);
  });

  it('should ignore database creation error', async () => {
    const DBC = proxyquire('../../controller/database.controller', {
      'influxdb-nodejs': function Influx(uri) {
        this.uri = uri;
        this.createDatabase = sinon.stub().throws('Creation error');
        this.schema = sinon.stub();
      },
    });

    await DBC(log);
  });

  it('should fallback to default values if no env is set', async () => {

    const restore = mockedEnv({
      INFLUX_HOST: undefined,
      INFLUX_PORT: undefined,
      INFLUX_DB: undefined,
    });

    const DBC = proxyquire('../../controller/database.controller', {
      'influxdb-nodejs': function Influx(uri) {
        this.uri = uri;
        expect(uri).to.eq('http://influx:8086/temp')
        this.createDatabase = sinon.stub();
        this.schema = sinon.stub();
      },
    });

    await DBC(log);

    restore();
  });

  it('should write measurement, heating off', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = false;
    const slaveData = {
      temp: 5,
      hum: 50,
    };

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating, slaveData);
  });

  it('should write measurement, heating on', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = true;
    const slaveData = {
      temp: 5,
      hum: 50,
    };

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating, slaveData);
  });

  it('should write measurement without slave data, heating off', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = false;

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating);
  });

  it('should write measurement without slave data, heating on', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = true;

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating);
  });
});
