import * as bunyan from 'bunyan';
import * as ds18b20 from 'ds18b20';
import { CacheController } from './';

const SENSOR_ID = process.env.SENSOR_ID || '10-0008032d5234';

export class TempController {
  private cache: CacheController;
  private log: bunyan;
  private prevValue: Number = 20.0;

  constructor(log: bunyan, cache: CacheController) {
    this.log = log;
    this.log.info('Creating temp controller');
    this.cache = cache;
  }

  public async getCurrentTemp() {
    this.log.trace({ SENSOR_ID }, 'Getting current temperature');
    return new Promise((resolve, reject) => {
      ds18b20.temperature(SENSOR_ID, async (err, value) => {
        if (err) {
          this.log.error({ err }, 'Error getting current temperature');
          return reject(err);
        }

        let returnValue: Number = value;

        // ignore the reset value of the sensor
        if (value === 85.0) {
          this.log.debug(`Sensor returned reset value 85, using previous value ${this.prevValue}`);
          returnValue = this.prevValue;
        }

        this.log.trace({
          value: returnValue,
        }, 'Successfully got current temperature');
        this.prevValue = returnValue;
        await this.cache.updateCurrentTemperature(returnValue);
        return resolve(returnValue);
      });
    });
  };
}
