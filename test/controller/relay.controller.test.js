const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockedRelay = require('../mock/relay');
const CacheController = require('../../controller/cache.controller')(log);

describe('Relay Controller', () => {
  let restore;
  let relayController;
  beforeEach(() => {
    restore = mockedEnv({
      OVERSHOOT_TEMP: '1',
    });

    delete require.cache[require.resolve('../../controller/relay.controller')];

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    relayController = proxyquire('../../controller/relay.controller', {
      '../test/mock/relay': mockedRelay,
    })(log, CacheController);
  });

  afterEach(() => {
    restore();
  });

  it('should get initial state', async () => {
    const stub = sinon.stub(mockedRelay, 'read').callsArgWith(0, null, 0);

    const initialState = await relayController.getRelay();

    expect(initialState).to.equal(0);

    stub.restore();
  });

  it('should set 1 state', async () => {
    const stubRead = sinon.stub(mockedRelay, 'read');
    stubRead.onCall(0).callsArgWith(0, null, 0);
    stubRead.onCall(1).callsArgWith(0, null, 1);
    stubRead.onCall(2).callsArgWith(0, null, 1);
    stubRead.onCall(3).callsArgWith(0, null, 1);
    const stubWrite = sinon.stub(mockedRelay, 'write').callsArgWith(1, null);

    await relayController.setRelay(1);
    const newState = await relayController.getRelay();

    expect(newState).to.equal(1);

    await relayController.setRelay(1);
    const sameState = await relayController.getRelay();

    expect(sameState).to.equal(1);

    stubRead.restore();
    stubWrite.restore();
  });

  it('should fail to set relay [read error]', async () => {
    const stub = sinon.stub(mockedRelay, 'read').callsArgWith(0, new Error('Unable to read pin'));
    try {
      await relayController.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
    stub.restore();
  });

  it('should fail to set relay [write error]', async () => {
    const stub = sinon.stub(mockedRelay, 'write').callsArgWith(1, new Error('Unable to write pin'));
    try {
      await relayController.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
    stub.restore();
  });

  it('should fail to get relay', async () => {
    const stub = sinon.stub(mockedRelay, 'read').callsArgWith(0, new Error('Unable to read pin'));
    try {
      await relayController.getRelay();
    } catch (err) {
      assert.isDefined(err);
    }
    stub.restore();
  });
});
