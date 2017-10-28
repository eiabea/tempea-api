const Gpio = require('onoff').Gpio;
const relay = new Gpio(17, 'out');

const getRelay = async function() {
  return new Promise((resolve, reject)=>{
    relay.read((err, state)=>{
      if (err) {
        return reject(err);
      }

      return resolve(state);
    });
  });
};

const setRelay = async function(state) {
  return new Promise(async (resolve, reject)=>{
    try {
      const currentState = await getRelay();
      console.log('Current relay state ' + currentState);

      if (currentState === state) {
        return resolve();
      }
      console.log('Setting relay to ' + state);

      return relay.write(state, (err)=>{
        if (err) {
          throw err;
        }

        return resolve();
      });
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  getRelay: getRelay,
  setRelay: setRelay
};
