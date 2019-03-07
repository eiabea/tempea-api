const mockedEnv = require('mocked-env');
const { expect } = require('chai');
const log = require('null-logger');
const proxyquire = require('proxyquire');

const CacheController = require('../../controller/cache.controller')(log);
// Preload files
require('../../controller/calendar.controller');

describe('Calendar Controller (None)', () => {
  let restore;
  before(() => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'wrong',
      GOOGLE_SERVICE_ACCOUNT_JSON: 'tempea-mocked.json',
      GOOGLE_CALENDAR_ID: 'tempea-mocked',
      TOKEN_DIR: 'test/secrets',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });
  });

  after(() => {
    restore();
  });

  it('should return MIN_TEMP', async () => {
    const CC = proxyquire('../../controller/calendar.controller', {
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });
});
