const request = require('request');

module.exports = (log, cache) => {
  const getData = async () => new Promise((resolve, reject) => {
    const {
      SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT,
    } = process.env;
    request(`http://${SLAVE_HOST}:${SLAVE_PORT}${SLAVE_ENDPOINT}`, async (error, response, body) => {
      if (error) {
        log.error({ error }, `Error getting data from slave ${SLAVE_HOST}`);
        return reject(error);
      }
      log.trace({ body }, 'Slavedata');
      try {
        const jsonData = JSON.parse(body);
        await cache.updateSlaveData(jsonData);
        return resolve(jsonData);
      } catch (err) {
        return reject(err);
      }
    });
  });

  return {
    getData,
  };
};
