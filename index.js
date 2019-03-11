const App = require('./app');

(async () => {
  const TEMPEA_LOG_LEVEL = parseInt(process.env.TEMPEA_LOG_LEVEL, 10) || 50;
  await App(TEMPEA_LOG_LEVEL).start();
})();
