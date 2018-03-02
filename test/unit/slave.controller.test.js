const { expect } = require('chai');
const log = require('null-logger');
const nock = require('nock');

process.env.CI = 'true';

const SLAVE_HOST = 'mocked.tempea.com';
const SLAVE_PORT = 80;
const SLAVE_ENDPOINT = '/mocked';

// // Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../../controller/slave.controller')];

process.env.SLAVE_HOST = SLAVE_HOST;
process.env.SLAVE_PORT = SLAVE_PORT;
process.env.SLAVE_ENDPOINT = SLAVE_ENDPOINT;

const SlaveController = require('../../controller/slave.controller')(log);

// Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../../controller/slave.controller')];

process.env.SLAVE_HOST = 'localhost';
process.env.SLAVE_PORT = 80;
process.env.SLAVE_ENDPOINT = '/mocked';

const FailingSlaveController = require('../../controller/slave.controller')(log);

describe('Slave Controller', () => {
  const mockedSlaveResponse = {
    success: true,
    data: {
      temp: 2.1,
      hum: 62,
    },
  };

  before(() => {
    nock(`http://${SLAVE_HOST}:${SLAVE_PORT}`)
      .get(SLAVE_ENDPOINT)
      .reply(200, mockedSlaveResponse);
  });

  it('should get slave temperature', async () => {
    const slaveData = await SlaveController.getData();

    expect(slaveData).to.deep.equal(mockedSlaveResponse);
  });

  it('should fail', async () => {
    try {
      await FailingSlaveController.getData();
    } catch (err) {
      expect(err).to.be.instanceof(Error);
      expect(err.code).to.equal('ECONNREFUSED');
    }
  });
});
