require('../Helper').invalidateNodeCache();

const log = require('null-logger');
const nock = require('nock');

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

  it('write measurement', async () => {
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

  it('write measurement without slave data', async () => {
    const currentTemp = 21;
    const desiredTemp = 21;
    const heating = false;

    const instance = await DatabaseController(log);

    await instance.writeMeasurement(currentTemp, desiredTemp, heating);
  });
});
