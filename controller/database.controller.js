const Influx = require('influxdb-nodejs');

const INFLUX_HOST = process.env.INFLUX_HOST || 'influx';
const INFLUX_PORT = process.env.INFLUX_PORT || 8086;
const INFLUX_DB = process.env.INFLUX_DB || 'temp';

const INFLUX_URI = `http://${INFLUX_HOST}:${INFLUX_PORT}/${INFLUX_DB}`;

module.exports = async (log) => {
  log.info('Creating influx client');
  let client;

  const initClient = async () => {
    client = new Influx(INFLUX_URI);
    const fieldSchema = {
      cur: 'f',
      des: 'f',
      heat: 'i',
      slaveCur: 'f',
      slaveHum: 'f',
    };

    client.schema('temperature', fieldSchema, {
      stripUnknown: true,
    });
  };

  const initDB = async () => {
    try {
      await client.createDatabase();
    } catch (err) {
      log.warn({ err }, 'Error creating database', err);
    }
  };

  await initClient();
  await initDB();

  const writeMeasurement = (currentTemp, desiredTemp, heating, slave) => {
    log.trace('Writing measurement');
    if (!slave) {
      return client.write('temperature')
        .field({
          cur: currentTemp,
          des: desiredTemp,
          heat: heating ? 100 : 0,
        });
    }

    return client.write('temperature')
      .field({
        cur: currentTemp,
        des: desiredTemp,
        heat: heating ? 100 : 0,
        slaveCur: slave.temp,
        slaveHum: slave.hum,
      });
  };

  return {
    writeMeasurement,
  };
};
