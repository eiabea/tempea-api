require('../Helper').invalidateNodeCache();

const { assert } = require('chai');
const log = require('null-logger');

process.env.CI = 'true';

process.env.FETCHING_INTERVAL = '40';

const ScheduleController = require('../../controller/schedule.controller')(log);

describe('Schedule Controller', () => {
  it('should get initial state', async () => {
    const isRunning = await ScheduleController.isJobRunning();

    assert.isFalse(isRunning);
  });

  it('should start a cronjob', async () => {
    await ScheduleController.startJob();

    const isRunning = await ScheduleController.isJobRunning();

    assert.isTrue(isRunning);
  });

  it('should stop a cronjob', async () => {
    await ScheduleController.stopJob();

    const isRunning = await ScheduleController.isJobRunning();

    assert.isFalse(isRunning);
  });
});
