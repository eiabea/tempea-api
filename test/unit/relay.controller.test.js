const { expect } = require('chai');
const log = require('null-logger');

const RelayController = require('../../controller/relay.controller')(log);

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
});
