const log = require('null-logger');

process.env.CI = 'true';

const DatabaseController = require('../../controller/database.controller');

describe('Database Controller', () => {
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
