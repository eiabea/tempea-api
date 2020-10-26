const mockedEnv = require('mocked-env');
const { assert } = require('chai');
const log = require('null-logger');

describe('Heat Controller', () => {
  let restore;
  let heatController;
  beforeEach(() => {
    restore = mockedEnv({
      OVERSHOOT_TEMP: '1',
    });

    delete require.cache[require.resolve('../../controller/heat.controller')];

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    heatController = require('../../controller/heat.controller')(log);
  });

  afterEach(() => {
    restore();
  });

  it('should return true [current temp too low]', async () => {
    assert.isTrue(await heatController.shouldHeat(15, 19, false));
  });

  it('should return true [heating up to desired temp + overshoot]', async () => {
    assert.isTrue(await heatController.shouldHeat(19.5, 19, true));
  });

  it('should return false [current temp over temp + overshoot]', async () => {
    assert.isFalse(await heatController.shouldHeat(20.5, 19, true));
  });

  it('should return false [cooling down to desired temp]', async () => {
    assert.isFalse(await heatController.shouldHeat(19.5, 19, false));
  });
});
