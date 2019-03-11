const request = require('request');
const { assert } = require('chai');

module.exports = (log, cache) => {
  const getData = async () => new Promise((resolve, reject) => {
    const {
      SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT,
    } = process.env;
    log.trace({ SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT }, 'Getting data from slave');
    request(`http://${SLAVE_HOST}:${SLAVE_PORT}${SLAVE_ENDPOINT}`, async (error, response, body) => {
      if (error) {
        log.error({ error }, `Error getting data from slave ${SLAVE_HOST}`);
        return reject(error);
      }
      log.trace({ body }, 'Received data from slave');
      try {
        const jsonData = JSON.parse(body);

        assert.isTrue(jsonData.success);
        assert.isDefined(jsonData.data);
        assert.isNumber(jsonData.data.temp);

        await cache.updateSlaveData(jsonData.data);
        return resolve(jsonData.data);
      } catch (err) {
        return reject(err);
      }
    });
  });

  return {
    getData,
  };
};
