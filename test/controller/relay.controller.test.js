require('../Helper').invalidateNodeCache();

const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const mockedRelay = require('../mock/relay');

process.env.CI = 'true';
process.env.MOCK_RELAY_FAIL = 'false';

const CacheController = require('../../controller/cache.controller')(log);
const RelayController = require('../../controller/relay.controller')(log, CacheController);

describe('Relay Controller', () => {
  it('should get initial state', async () => {
    const stub = sinon.stub(mockedRelay, 'read').callsArgWith(0, null, 0);

    const initialState = await RelayController.getRelay();

    expect(initialState).to.equal(0);

    stub.restore();
  });

  it('should set 1 state', async () => {
    await RelayController.setRelay(1);
    const newState = await RelayController.getRelay();

    expect(newState).to.equal(1);
  });

  it('should set 1 state again', async () => {
    await RelayController.setRelay(1);
    const newState = await RelayController.getRelay();

    expect(newState).to.equal(1);
  });

  it('should fail to set relay [read error]', async () => {
    try {
      sinon.stub(mockedRelay, 'read').throws(new Error('Unable to read pin'));

      await RelayController.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to set relay [write error]', async () => {
    try {
      sinon.stub(mockedRelay, 'write').throws(new Error('Unable to write pin'));

      await RelayController.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get relay', async () => {
    try {
      sinon.stub(mockedRelay, 'read').throws(new Error('Unable to read pin'));

      await RelayController.getRelay();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
