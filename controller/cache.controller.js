module.exports = (log) => {
  log.info('Creating cache controller');
  // TODO: using redis?
  let cache = {
    master: {},
  };

  const updateRelayState = async (state) => {
    log.trace({ state }, 'Updating relay state');
    cache.master.updated = Date.now();
    cache.master.relay = state;
    return true;
  };

  const getRelayState = async () => {
    log.trace('Getting relay state');
    if (cache.master.relay !== undefined) {
      return cache.master.relay;
    }

    throw Error('No cached value available');
  };

  const updateDesiredObject = async (desired) => {
    const desiredTagged = Object.assign(desired, { updated: Date.now() });
    log.trace({ desiredTagged }, 'Updating desired temperature');
    cache.desired = desiredTagged;
    return true;
  };

  const getDesiredObject = async () => {
    log.trace('Getting desired temperature');
    if (cache.desired) {
      return cache.desired;
    }

    throw Error('No cached value available');
  };

  const updateCurrentTemperature = async (current) => {
    log.trace({ current }, 'Updating current temperature');
    cache.master.updated = Date.now();
    cache.master.current = current;
    return true;
  };

  const getCurrentTemperature = async () => {
    log.trace('Getting current temperature');
    if (cache.master.current) {
      return cache.master.current;
    }

    throw Error('No cached value available');
  };

  const updateSlaveData = async (data) => {
    log.trace({ data }, 'Updating slave data');
    const slaveTagged = Object.assign(data, { updated: Date.now() });
    cache.slave = slaveTagged;
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
    // Do not override updated, already present from influx
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

  const getMasterUpdated = async () => {
    log.trace('Getting master updated data');
    if (cache.master.updated) {
      return cache.master.updated;
    }

    throw Error('No cached value available');
  };

  const invalidate = async () => {
    cache = {
      master: {},
    };
  };

  return {
    invalidate,
    updateDesiredObject,
    getDesiredObject,
    updateRelayState,
    getRelayState,
    updateCurrentTemperature,
    getCurrentTemperature,
    updateSlaveData,
    getSlaveData,
    getMqttData,
    updateMqttData,
    getMasterUpdated,
  };
};
