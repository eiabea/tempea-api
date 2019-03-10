const { Gpio } = require('onoff');

const { CI } = process.env;

const relay = CI ? require('../test/mock/relay') : new Gpio(17, 'out');

module.exports = (log, cache) => {
  const getRelay = async () => {
    log.trace({ func: 'getRelay' }, 'Reading relay gpio');
    return new Promise((resolve, reject) => {
      relay.read((err, state) => {
        if (err) {
          log.error({ func: 'getRelay', err }, 'Error getting relay gpio state');
          return reject(err);
        }

        log.trace({ func: 'getRelay', state }, 'Successfully got relay gpio state');
        return resolve(state);
      });
    });
  };

  const setRelay = async (state) => {
    log.trace({ func: 'setRelay', state }, 'Setting relay gpio');
    return new Promise(async (resolve, reject) => {
      let currentState;
      try {
        currentState = await getRelay();
        log.trace({ func: 'setRelay', currentState }, 'Got current gpio state');
      } catch (err) {
        return reject(err);
      }

      if (currentState === state) {
        log.trace(
          { func: 'setRelay', state, currentState },
          'Desired state and current state are the same',
        );
        return resolve();
      }
      log.trace({ func: 'setRelay', state }, 'Changing gpio state');

      return relay.write(state, async (err) => {
        if (err) {
          log.error({ func: 'getRelay', state, err }, 'Error setting relay gpio state');
          return reject(err);
        }

        log.trace({ func: 'setRelay', state }, 'Successfully changed the state');

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
