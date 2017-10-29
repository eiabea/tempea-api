const Gpio = require('onoff').Gpio;
const relay = new Gpio(17, 'out');

module.exports = (log) => {
  this.log = log.child({controller: 'relay'});

  const getRelay = async () => {
    this.log.trace({func: 'getRelay'}, 'Reading relay gpio');
    return new Promise((resolve, reject) => {
      relay.read((err, state) => {
        if (err) {
          this.log.error({func: 'getRelay', err}, 'Error getting relay gpio state');
          return reject(err);
        }

        this.log.trace({func: 'getRelay', state}, 'Successfully got relay gpio state');
        return resolve(state);
      });
    });
  };

  const setRelay = async (state) => {
    this.log.trace({func: 'setRelay', state}, 'Setting relay gpio');
    return new Promise(async (resolve, reject) => {
      try {
        const currentState = await getRelay();
        this.log.trace({func: 'setRelay', currentState}, 'Got current gpio state');

        if (currentState === state) {
          this.log.trace({func: 'setRelay', state, currentState},
            'Desired state and current state are the same');
          return resolve();
        }
        this.log.trace({func: 'setRelay', state}, 'Changing gpio state');

        return relay.write(state, (err) => {
          if (err) {
            this.log.error({func: 'getRelay', state, err}, 'Error setting relay gpio state');
            throw err;
          }

          this.log.trace({func: 'setRelay', state}, 'Successfully changed the state');
          return resolve();
        });
      } catch (err) {
        return reject(err);
      }
    });
  };

  return {
    getRelay: getRelay,
    setRelay: setRelay
  };
};
