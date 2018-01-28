const { CI } = process.env;

const ds18b20 = CI ? require('../test/mock/ds18b20') : require('ds18b20');

const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

module.exports = (log) => {
  let prevValue = 20.0;

  const getCurrentTemp = async () => {
    log.trace({ func: 'getCurrentTemp' }, 'Getting current temperature');
    return new Promise((resolve, reject) => {
      ds18b20.temperature(SENSOR_ID, (err, value) => {
        if (err) {
          log.error({ func: 'getCurrentTemp', err }, 'Error current temperature');
          return reject(err);
        }

        let returnValue = value;

        // ignore the reset value of the sensor
        if (value === 85.0) {
          returnValue = prevValue;
        }

        log.trace({
          func: 'getCurrentTemp',
          value: returnValue,
        }, 'Successfully got current temperature');
        prevValue = returnValue;
        return resolve(returnValue);
      });
    });
  };

  return {
    getCurrentTemp,
  };
};
