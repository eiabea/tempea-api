module.exports.invalidateNodeCache = () => {
  // Controller
  delete require.cache[require.resolve('../controller/auth.controller')];
  delete require.cache[require.resolve('../controller/calendar.controller')];
  delete require.cache[require.resolve('../controller/database.controller')];
  delete require.cache[require.resolve('../controller/heat.controller')];
  delete require.cache[require.resolve('../controller/relay.controller')];
  delete require.cache[require.resolve('../controller/schedule.controller')];
  delete require.cache[require.resolve('../controller/slave.controller')];
  delete require.cache[require.resolve('../controller/temp.controller')];
  // Routes
  delete require.cache[require.resolve('../routes/v1/auth.route')];
  delete require.cache[require.resolve('../routes/v1/status.route')];
  // Mocks
  delete require.cache[require.resolve('./mock/relay')];
  delete require.cache[require.resolve('./mock/ds18b20')];
  // app
  delete require.cache[require.resolve('../app')];
};
