const { assert, expect } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';

const CacheController = require('../../controller/cache.controller')(log);
const TempController = require('../../controller/temp.controller')(log, CacheController);

describe('Temp Controller', () => {
  it('should get current temperature', async () => {
    const temp = await TempController.getCurrentTemp();

    expect(temp).to.equal(21);
  });

  it('should get previous temperature', async () => {
    // Invalidate require cache to create instance with new environment variables
    delete require.cache[require.resolve('../mock/ds18b20')];
    delete require.cache[require.resolve('../../controller/temp.controller')];
    process.env.MOCK_TEMP_RESET = 'true';

    // eslint-disable-next-line global-require
    const temp = await require('../../controller/temp.controller')(log, CacheController).getCurrentTemp();

    expect(temp).to.equal(20);
    process.env.MOCK_TEMP_RESET = 'false';
  });

  it('should fail to get temperature', async () => {
    delete require.cache[require.resolve('../mock/ds18b20')];
    delete require.cache[require.resolve('../../controller/temp.controller')];
    process.env.MOCK_TEMP_FAIL = 'true';

    try {
      // eslint-disable-next-line global-require
      await require('../../controller/temp.controller')(log, CacheController).getCurrentTemp();
    } catch (err) {
      assert.isDefined(err);
    }
    process.env.MOCK_TEMP_FAIL = 'false';
  });
});
