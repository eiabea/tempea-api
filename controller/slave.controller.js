const request = require('request');
const axios = require('axios');
const { assert } = require('chai');

module.exports = (log, cache) => {
  const getData = async () => {

    const {
      SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT,
    } = process.env;

    log.trace({ SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT }, 'Getting data from slave');
    try {
      const response = await axios.get(`http://${SLAVE_HOST}:${SLAVE_PORT}${SLAVE_ENDPOINT}`);

      const { data } = response;

      assert.isTrue(data.success);
      assert.isDefined(data.data);
      assert.isNumber(data.data.temp);

      await cache.updateSlaveData(data.data);
      return data.data;
    } catch (error) {
      log.error({ error }, `Error getting data from slave ${SLAVE_HOST}`);
      throw error;
    }
  }

  return {
    getData,
  };
};
