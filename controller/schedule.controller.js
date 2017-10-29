const CronJob = require('cron').CronJob;
const FETCHING_INTERVAL = parseInt(process.env.FETCHING_INTERVAL, 10) || 5;
const TIME_ZONE = process.env.TIME_ZONE || 'Europe/Vienna';

module.exports = (log)=>{
  this.log = log.child({controller: 'schedule'});

  this.cronPattern = '* */' + FETCHING_INTERVAL + ' * * *';

  const isJobRunning = ()=>{
    if (!this.job) {
      return false;
    }
    return this.job.running;
  };

  const startJob = (callback)=>{
    this.job = new CronJob(this.cronPattern, callback, null, true, TIME_ZONE);
  };

  return {
    startJob,
    isJobRunning
  };
};
