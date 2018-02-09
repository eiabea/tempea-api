const { assert, expect } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';

const TempController = require('../../controller/temp.controller')(log);

// Invalidate require cache to create instance with new environment variables
delete require.cache[require.resolve('../mock/ds18b20')];
delete require.cache[require.resolve('../../controller/temp.controller')];
process.env.MOCK_TEMP_RESET = 'true';
const ResetTempController = require('../../controller/temp.controller')(log);

delete require.cache[require.resolve('../mock/ds18b20')];
delete require.cache[require.resolve('../../controller/temp.controller')];
process.env.MOCK_TEMP_FAIL = 'true';
const FailingTempController = require('../../controller/temp.controller')(log);

describe('Temp Controller', () => {
  it('should get current temperature', async () => {
    const temp = await TempController.getCurrentTemp();

    expect(temp).to.equal(21);
  });

  it('should get previous temperature', async () => {
    const temp = await ResetTempController.getCurrentTemp();

    expect(temp).to.equal(20);
  });

  it('should fail to get temperature', async () => {
    try {
      await FailingTempController.getCurrentTemp();
    } catch (err) {
      assert.isDefined(err);
    }
  });
});
