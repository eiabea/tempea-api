const mockedEnv = require('mocked-env');

const { expect } = require('chai');
const log = require('null-logger');
const nock = require('nock');

const SLAVE_HOST = 'mocked.tempea.com';
const SLAVE_PORT = '80';
const SLAVE_ENDPOINT = '/mocked';

const CacheController = require('../../controller/cache.controller')(log);

describe('Slave Controller', () => {
  const mockedSlaveResponse = {
    success: true,
    data: {
      temp: 2.1,
      hum: 62,
    },
  };

  beforeEach(() => {
    delete require.cache[require.resolve('../../controller/slave.controller')];
  });

  it('should get slave temperature', async () => {
    const restore = mockedEnv({
      SLAVE_HOST,
      SLAVE_PORT,
      SLAVE_ENDPOINT,
    });

    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(200, mockedSlaveResponse);

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    const slaveController = require('../../controller/slave.controller')(log, CacheController);
    const slaveData = await slaveController.getData();

    expect(slaveData).to.deep.equal(mockedSlaveResponse);

    restore();
  });

  it('should fail [wrong host]', async () => {
    const restore = mockedEnv({
      SLAVE_HOST: 'localhost',
      SLAVE_PORT: '80',
      SLAVE_ENDPOINT: '/mocked',
    });

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    const slaveController = require('../../controller/slave.controller')(log, CacheController);

    try {
      await slaveController.getData();
    } catch (err) {
      expect(err).to.be.instanceof(Error);
      expect(err.code).to.equal('ECONNREFUSED');
    }

    restore();
  });

  it('should fail [invalid json]', async () => {
    const restore = mockedEnv({
      SLAVE_HOST,
      SLAVE_PORT,
      SLAVE_ENDPOINT: `${SLAVE_ENDPOINT}_invalid_json`,
    });

    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(`${SLAVE_ENDPOINT}_invalid_json`)
      .reply(200, '{"success":false');

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    const slaveController = require('../../controller/slave.controller')(log, CacheController);

    try {
      await slaveController.getData();
    } catch (err) {
      expect(err).to.be.instanceof(SyntaxError);
    }

    restore();
  });
});
