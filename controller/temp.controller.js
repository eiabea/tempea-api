const ds18b20 = require('ds18b20');
const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

module.exports = (log) => {
  this.log = log.child({controller: 'temp'});
  this.prevValue = 20.0;

  const getCurrentTemp = async () => {
    this.log.trace({func: 'getCurrentTemp'}, 'Getting current temperature');
    return new Promise((resolve, reject)=>{
      ds18b20.temperature(SENSOR_ID, (err, value) => {
        if (err) {
          this.log.error({func: 'getCurrentTemp', err}, 'Error current temperature');
          return reject(err);
        }

        let returnValue = value;

        // ignore the reset value of the sensor
        if (value === 85.0) {
          returnValue = this.prevValue;
        }

        this.log.trace({
          func: 'getCurrentTemp',
          value: returnValue
        }, 'Successfully got current temperature');
        this.prevValue = returnValue;
        return resolve(returnValue);
      });
    });
  };

  return {
    getCurrentTemp
  };
};
