require('../Helper').invalidateNodeCache();

const { assert, expect } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';

const RelayController = require('../../controller/relay.controller')(log);

// Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../mock/relay')];
delete require.cache[require.resolve('../../controller/relay.controller')];
process.env.MOCK_RELAY_FAIL = 'true';
const FailingRelayController = require('../../controller/relay.controller')(log);

process.env.MOCK_RELAY_FAIL = 'false';

describe('Relay Controller', () => {
  it('should get initial state', async () => {
    const initialState = await RelayController.getRelay();

    expect(initialState).to.equal(0);
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

  it('should fail to set relay', async () => {
    try {
      await FailingRelayController.setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get relay', async () => {
    try {
      await FailingRelayController.getRelay();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
