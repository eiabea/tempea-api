const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockedDS18B20 = require('../mock/ds18b20');

process.env.CI = 'true';

const CacheController = require('../../controller/cache.controller')(log);
// Preload files
require('../../controller/temp.controller');

describe('Temp Controller', () => {
  let tempController;
  beforeEach(() => {
    delete require.cache[require.resolve('../../controller/temp.controller')];

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    tempController = proxyquire('../../controller/temp.controller', {
      '../test/mock/ds18b20': mockedDS18B20,
    })(log, CacheController);
  });

  it('should get current temperature', async () => {
    const temp = await tempController.getCurrentTemp();

    expect(temp).to.equal(21);
  });

  it('should get previous temperature', async () => {
    const stub = sinon.stub(mockedDS18B20, 'temperature').callsArgWith(1, null, 85);

    const temp = await tempController.getCurrentTemp();

    expect(temp).to.equal(20);

    stub.restore();
  });

  it('should fail to get temperature', async () => {
    const stub = sinon.stub(mockedDS18B20, 'temperature').callsArgWith(1, new Error('Mocked temp error'));

    try {
      await tempController.getCurrentTemp();
    } catch (err) {
      assert.isDefined(err);
    }

    stub.restore();
  });
});
