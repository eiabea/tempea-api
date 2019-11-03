const ds18b20 = require('ds18b20');

const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

module.exports = (log, cache) => {
  let prevValue = 20.0;

  const getCurrentTemp = async () => {
    log.trace({ SENSOR_ID }, 'Getting current temperature');
    return new Promise((resolve, reject) => {
      ds18b20.temperature(SENSOR_ID, async (err, value) => {
        if (err) {
          log.error({ err }, 'Error getting current temperature');
          return reject(err);
        }

        let returnValue = value;

        // ignore the reset value of the sensor
        if (value === 85.0) {
          log.debug(`Sensor returned reset value 85, using previous value ${prevValue}`);
          returnValue = prevValue;
        }

        log.trace({
          value: returnValue,
        }, 'Successfully got current temperature');
        prevValue = returnValue;
        await cache.updateCurrentTemperature(returnValue);
        return resolve(returnValue);
      });
    });
  };

  return {
    getCurrentTemp,
  };
};
