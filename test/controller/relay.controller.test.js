const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();
const CacheController = require('../../controller/cache.controller')(log);

describe('Relay Controller', () => {
  let restore;
  beforeEach(() => {
    restore = mockedEnv({
      OVERSHOOT_TEMP: '1',
    });
  });

  afterEach(() => {
    restore();
  });

  it('should get initial state', async () => {
    const stub = sinon.stub().callsArgWith(0, null, 0);

    const instance = proxyquire.noCallThru().load('../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stub,
          };
        },
      },
    })(log, CacheController);

    const initialState = await instance.getRelay();

    expect(initialState).to.equal(0);

    assert.isTrue(stub.called);
  });

  it('should set 1 state', async () => {
    const stubRead = sinon.stub();
    stubRead.onCall(0).callsArgWith(0, null, 0);
    stubRead.onCall(1).callsArgWith(0, null, 1);
    stubRead.onCall(2).callsArgWith(0, null, 1);
    stubRead.onCall(3).callsArgWith(0, null, 1);
    const stubWrite = sinon.stub().callsArgWith(1, null);

    const instance = proxyquire.noCallThru().load('../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stubRead,
            write: stubWrite,
          };
        },
      },
    })(log, CacheController);

    await instance.setRelay(1);
    const newState = await instance.getRelay();

    expect(newState).to.equal(1);

    await instance.setRelay(1);
    const sameState = await instance.getRelay();

    expect(sameState).to.equal(1);

    assert.isTrue(stubRead.called);
    assert.isTrue(stubWrite.called);
  });

  it('should fail to set relay [read error]', async () => {
    const stub = sinon.stub().callsArgWith(0, new Error('Unable to read pin'));

    const instance = proxyquire.noCallThru().load('../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stub,
          };
        },
      },
    })(log, CacheController);

    try {
      await instance.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to set relay [write error]', async () => {
    const stubRead = sinon.stub().callsArgWith(0, null, 0);
    const stubWrite = sinon.stub().callsArgWith(1, new Error('Unable to write pin'));

    const instance = proxyquire.noCallThru().load('../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stubRead,
            write: stubWrite,
          };
        },
      },
    })(log, CacheController);

    try {
      await instance.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }

    assert.isTrue(stubRead.called);
    assert.isTrue(stubWrite.called);
  });

  it('should fail to get relay', async () => {
    const stub = sinon.stub().callsArgWith(0, new Error('Unable to read pin'));

    const instance = proxyquire.noCallThru().load('../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          return {
            read: stub,
          };
        },
      },
    })(log, CacheController);

    try {
      await instance.getRelay();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
