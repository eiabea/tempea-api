const { Gpio } = require('onoff');

const RELAY_GPIO_PIN = parseInt(process.env.RELAY_GPIO_PIN, 10) || 17;

const relay = new Gpio(RELAY_GPIO_PIN, 'out');

module.exports = (log, cache) => {
  const getRelay = async () => {
    log.trace('Getting relay gpio state');
    return new Promise((resolve, reject) => {
      relay.read((err, state) => {
        if (err) {
          log.error({ err }, 'Error getting relay gpio state');
          return reject(err);
        }

        log.trace({ state }, 'Successfully got relay gpio state');
        return resolve(state);
      });
    });
  };

  const setRelay = async (state) => {
    log.trace({ state }, 'Setting relay gpio state');
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let currentState;
      try {
        currentState = await getRelay();
        log.trace({ currentState }, 'Got current gpio state');
      } catch (err) {
        return reject(err);
      }

      if (currentState === state) {
        log.trace(
          { state, currentState },
          'Desired state and current state are the same',
        );
        return resolve();
      }
      log.trace({ state }, 'Changing gpio state');

      return relay.write(state, async (err) => {
        if (err) {
          log.error({ state, err }, 'Error setting relay gpio state');
          return reject(err);
        }

        log.trace({ state }, 'Successfully changed state');

        await cache.updateRelayState(state);

        return resolve();
      });
    });
  };

  return {
    getRelay,
    setRelay,
  };
};
