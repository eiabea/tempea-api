require('../Helper').invalidateNodeCache();

const log = require('null-logger');
const nock = require('nock');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockedInflux = function Influx(uri) {
  this.createDatabase = async () => {
    throw new Error("Mocked creation error")
  };
  this.schema = (one, two, three)=>{ }
};

process.env.CI = 'true';

const INFLUX_HOST = process.env.INFLUX_HOST || 'influx';
const INFLUX_PORT = process.env.INFLUX_PORT || 8086;

const DatabaseController = require('../../controller/database.controller');

describe('Database Controller', () => {
  before(() => {
    nock(`http://${INFLUX_HOST}:${INFLUX_PORT}`)
      .post(/.*/g)
      .times(4)
      .reply(200);
  });

  it('should ignore database creation error', async () => {
    const DBC = proxyquire('../../controller/database.controller', {
      'influxdb-nodejs': mockedInflux,
    });

    await DBC(log);
  });

  it('should write measurement', async () => {
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

  it('should write measurement without slave data', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = false;

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating);
  });
});
