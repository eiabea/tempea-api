const mockedEnv = require('mocked-env');
const { assert } = require('chai');
const log = require('null-logger');

describe('Schedule Controller', () => {
  let restore;
  let scheduleController;
  beforeEach(() => {
    restore = mockedEnv({
      FETCHING_INTERVAL: '40',
    });

    delete require.cache[require.resolve('../../controller/schedule.controller')];

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    scheduleController = require('../../controller/schedule.controller')(log);
  });

  afterEach(() => {
    restore();
  });

  it('should get initial state', async () => {
    const isRunning = await scheduleController.isJobRunning();

    assert.isFalse(isRunning);
  });

  it('should start a cronjob', async () => {
    await scheduleController.startJob();

    const isRunning = await scheduleController.isJobRunning();

    assert.isTrue(isRunning);
  });

  it('should start a cronjob', async () => {
    restore = mockedEnv({
      FETCHING_INTERVAL: undefined,
    });

    delete require.cache[require.resolve('../../controller/schedule.controller')];

    // ensure brand new instance with correct env variables for every test
    // eslint-disable-next-line global-require
    scheduleController = require('../../controller/schedule.controller')(log);

    await scheduleController.startJob();

    const isRunning = await scheduleController.isJobRunning();

    assert.isTrue(isRunning);
  });

  it('should stop a cronjob', async () => {
    await scheduleController.startJob();
    await scheduleController.stopJob();

    const isRunning = await scheduleController.isJobRunning();

    assert.isFalse(isRunning);
  });

  it('should not fail to stop no job', async () => {
    await scheduleController.stopJob();

    const isRunning = await scheduleController.isJobRunning();

    assert.isFalse(isRunning);
  });
});
