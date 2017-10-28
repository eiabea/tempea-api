const ds18b20 = require('ds18b20');

const getCurrentTemp = async function() {
  return new Promise((resolve, reject)=>{
    // TODO use env var for sensor
    ds18b20.temperature('10-0008032d5234', (err, value) => {
      if (err) {
        return reject(err);
      }

      return resolve(value);
    });
  });
};

module.exports = {
  getCurrentTemp: getCurrentTemp
};
