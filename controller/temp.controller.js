const ds18b20 = require('ds18b20');
const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

module.exports = function(log) {
  this.log = log;

  const getCurrentTemp = async () => {
    this.log.trace({func: 'getCurrentTemp'}, 'Getting current temperature');
    return new Promise((resolve, reject)=>{
      ds18b20.temperature(SENSOR_ID, (err, value) => {
        if (err) {
          this.log.error({func: 'getCurrentTemp', err}, 'Error current temperature');
          return reject(err);
        }

        this.log.trace({func: 'getCurrentTemp', value}, 'Successfully got current temperature');
        return resolve(value);
      });
    });
  };

  return {
    getCurrentTemp: getCurrentTemp
  };
};
