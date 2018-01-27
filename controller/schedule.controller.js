const { CronJob } = require('cron');

const FETCHING_INTERVAL = parseInt(process.env.FETCHING_INTERVAL, 10) || 5;
const TIME_ZONE = process.env.TIME_ZONE || 'Europe/Vienna';
const cronPattern = `* */${FETCHING_INTERVAL} * * *`;

module.exports = (log) => {
  let job;

  const isJobRunning = () => {
    if (!job) {
      return false;
    }
    return job.running;
  };

  const startJob = (callback) => {
    log.info('Starting cron job');
    job = new CronJob(cronPattern, callback, null, true, TIME_ZONE);
  };

  return {
    startJob,
    isJobRunning,
  };
};
