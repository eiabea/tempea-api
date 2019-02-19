module.exports = (log) => {
  log.info('Creating cache controller');
  // TODO: using redis?
  let cache = {};

  const updateRelayState = async (state) => {
    log.trace({ state }, 'Updating relay state');
    cache.relay = state;
    return true;
  };

  const getRelayState = async () => {
    log.trace('Getting relay state');
    if (cache.relay !== undefined) {
      return cache.relay;
    }

    throw Error('No cached value available');
  };

  const updateDesiredTemperature = async (desired) => {
    log.trace({ desired }, 'Updating desired temperature');
    cache.desired = desired;
    return true;
  };

  const getDesiredTemperature = async () => {
    log.trace('Getting desired temperature');
    if (cache.desired) {
      return cache.desired;
    }

    throw Error('No cached value available');
  };

  const updateCurrentTemperature = async (current) => {
    log.trace({ current }, 'Updating current temperature');
    cache.current = current;
    return true;
  };

  const getCurrentTemperature = async () => {
    log.trace('Getting current temperature');
    if (cache.current) {
      return cache.current;
    }

    throw Error('No cached value available');
  };

  const updateSlaveData = async (data) => {
    log.trace({ data }, 'Updating slave data');
    cache.slave = data;
    return true;
  };

  const getSlaveData = async () => {
    log.trace('Getting slave data');
    if (cache.slave) {
      return cache.slave;
    }

    throw Error('No cached value available');
  };

  const updateMqttData = async (data) => {
    log.trace({ data }, 'Updating mqtt data');
    cache.mqtt = data;
    return true;
  };

  const getMqttData = async () => {
    log.trace('Getting mqtt data');
    if (cache.mqtt) {
      return cache.mqtt;
    }

    throw Error('No cached value available');
  };

  const invalidate = async () => {
    cache = {};
  };

  return {
    invalidate,
    updateDesiredTemperature,
    getDesiredTemperature,
    updateRelayState,
    getRelayState,
    updateCurrentTemperature,
    getCurrentTemperature,
    updateSlaveData,
    getSlaveData,
    getMqttData,
    updateMqttData,
  };
};
