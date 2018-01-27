const { Gpio } = require('onoff');

const relay = new Gpio(17, 'out');

module.exports = (log) => {
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
      try {
        const currentState = await getRelay();
        log.trace({ func: 'setRelay', currentState }, 'Got current gpio state');

        if (currentState === state) {
          log.trace(
            { func: 'setRelay', state, currentState },
            'Desired state and current state are the same',
          );
          return resolve();
        }
        log.trace({ func: 'setRelay', state }, 'Changing gpio state');

        return relay.write(state, (err) => {
          if (err) {
            log.error({ func: 'getRelay', state, err }, 'Error setting relay gpio state');
            throw err;
          }

          log.trace({ func: 'setRelay', state }, 'Successfully changed the state');
          return resolve();
        });
      } catch (err) {
        return reject(err);
      }
    });
  };

  return {
    getRelay,
    setRelay,
  };
};
