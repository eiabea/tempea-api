const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

const CacheController = require('../../controller/cache.controller')(log);

describe('Temp Controller', () => {
  it('should get current temperature', async () => {
    const stub = sinon.stub().callsArgWith(1, null, 21);

    const instance = proxyquire('../../controller/temp.controller', {
      ds18b20: {
        temperature: stub,
      },
    })(log, CacheController);

    const temp = await instance.getCurrentTemp();

    expect(temp).to.equal(21);
  });

  it('should get previous temperature', async () => {
    const stub = sinon.stub().callsArgWith(1, null, 85);

    const instance = proxyquire('../../controller/temp.controller', {
      ds18b20: {
        temperature: stub,
      },
    })(log, CacheController);

    const temp = await instance.getCurrentTemp();

    expect(temp).to.equal(20);

    assert.isTrue(stub.called);
  });

  it('should fail to get temperature', async () => {
    const stub = sinon.stub().callsArgWith(1, new Error('Mocked temp error'));

    const instance = proxyquire('../../controller/temp.controller', {
      ds18b20: {
        temperature: stub,
      },
    })(log, CacheController);

    try {
      await instance.getCurrentTemp();
    } catch (err) {
      assert.isDefined(err);
    }

    assert.isTrue(stub.called);
  });
});
