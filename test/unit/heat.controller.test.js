const { assert } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';

process.env.OVERSHOOT_TEMP = 1;

const HeatController = require('../../controller/heat.controller')(log);

describe('Heat Controller', () => {
  it('should return true [current temp too low]', async () => {
    assert.isTrue(await HeatController.shouldHeat(15, 19, false));
  });

  it('should return true [heating up to desired temp + overshoot]', async () => {
    assert.isTrue(await HeatController.shouldHeat(19.5, 19, true));
  });

  it('should return false [current temp over temp + overshoot]', async () => {
    assert.isFalse(await HeatController.shouldHeat(20.5, 19, true));
  });

  it('should return false [cooling down to desired temp]', async () => {
    assert.isFalse(await HeatController.shouldHeat(19.5, 19, false));
  });
});
