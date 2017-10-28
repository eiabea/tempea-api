const ds18b20 = require('ds18b20');
const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

const getCurrentTemp = async function() {
  return new Promise((resolve, reject)=>{
    ds18b20.temperature(SENSOR_ID, (err, value) => {
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
