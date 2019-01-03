require('../Helper').invalidateNodeCache();

const { assert, expect } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';
process.env.MOCK_RELAY_FAIL = 'false';

const CacheController = require('../../controller/cache.controller')(log);
const RelayController = require('../../controller/relay.controller')(log, CacheController);

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

  it('should fail to set relay [read error]', async () => {
    try {
      delete require.cache[require.resolve('../mock/relay')];
      delete require.cache[require.resolve('../../controller/relay.controller')];

      process.env.MOCK_RELAY_READ_FAIL = 'true';
      process.env.MOCK_RELAY_WRITE_FAIL = 'false';
      // eslint-disable-next-line global-require
      await require('../../controller/relay.controller')(log, CacheController)
        .setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to set relay [write error]', async () => {
    try {
      delete require.cache[require.resolve('../mock/relay')];
      delete require.cache[require.resolve('../../controller/relay.controller')];

      process.env.MOCK_RELAY_READ_FAIL = 'false';
      process.env.MOCK_RELAY_WRITE_FAIL = 'true';
      // eslint-disable-next-line global-require
      await require('../../controller/relay.controller')(log, CacheController)
        .setRelay(1);
    } catch (err) {
      assert.isDefined(err);
    }
  });

  it('should fail to get relay', async () => {
    try {
      delete require.cache[require.resolve('../mock/relay')];
      delete require.cache[require.resolve('../../controller/relay.controller')];

      process.env.MOCK_RELAY_READ_FAIL = 'true';
      // eslint-disable-next-line global-require
      await require('../../controller/relay.controller')(log, CacheController)
        .getRelay();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
