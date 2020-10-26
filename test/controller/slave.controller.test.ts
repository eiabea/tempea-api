import mockedEnv from 'mocked-env';

import { expect } from 'chai';
import * as log from 'null-logger';
import * as nock from 'nock';

const SLAVE_HOST = 'mocked.tempea.com';
const SLAVE_PORT = '80';
const SLAVE_ENDPOINT = '/mocked';

import { SlaveController, CacheController } from '../../controller';

const cacheController = new CacheController(log);

describe.only('Slave Controller', () => {
  const mockedSlaveResponse = {
    success: true,
    data: {
      temp: 2.1,
      hum: 62,
    },
  };

  let restore;
  before(() => {
    restore = mockedEnv({
      SLAVE_HOST,
      SLAVE_PORT,
      SLAVE_ENDPOINT,
    });
  });

  after(() => {
    restore();
  });

  it('should get slave temperature', async () => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(200, mockedSlaveResponse);

    const instance = new SlaveController(log, cacheController);

    const slaveData = await instance.getData();

    expect(slaveData.temp).to.eq(mockedSlaveResponse.data.temp);
    expect(slaveData.hum).to.eq(mockedSlaveResponse.data.hum);
  });

  it('should fail [wrong host]', async () => {
    restore = mockedEnv({
      SLAVE_HOST: 'localhost',
      SLAVE_PORT: '80',
      SLAVE_ENDPOINT: '/mocked',
    });

    const instance = new SlaveController(log, cacheController);

    try {
      await instance.getData();
    } catch (err) {
      expect(err).to.be.instanceof(Error);
      expect(err.code).to.equal('ECONNREFUSED');
    }
  });

  it('should fail [invalid json]', async () => {
    restore = mockedEnv({
      SLAVE_HOST,
      SLAVE_PORT,
      SLAVE_ENDPOINT: `${SLAVE_ENDPOINT}_invalid_json`,
    });

    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(`${SLAVE_ENDPOINT}_invalid_json`)
      .reply(200, '{"success":false');

    const instance = new SlaveController(log, cacheController);

    try {
      await instance.getData();
    } catch (err) {
      expect(err).to.be.instanceof(Error);
    }
  });
});
