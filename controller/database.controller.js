const Influx = require('influxdb-nodejs');
const { assert } = require('chai');

const INFLUX_HOST = process.env.INFLUX_HOST || 'influx';
const INFLUX_PORT = process.env.INFLUX_PORT || 8086;
const INFLUX_DB = process.env.INFLUX_DB || 'temp';
const INFLUX_MQTT_SERIES = process.env.INFLUX_MQTT_SERIES || 'mqtt_consumer';
const INFLUX_MQTT_TOPIC = process.env.INFLUX_MQTT_TOPIC || 'esp_temp';

const INFLUX_URI = `http://${INFLUX_HOST}:${INFLUX_PORT}/${INFLUX_DB}`;

module.exports = async (log, cache) => {
  log.trace('Creating influx client');
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
      log.error({ err }, 'Error creating database');
    }
  };

  await initClient();
  await initDB();

  const writeMeasurement = (currentTemp, desiredTemp, heating, slave) => {
    if (!slave) {
      log.trace({
        currentTemp, desiredTemp, heating,
      }, 'Writing measurement');
      return client.write('temperature')
        .field({
          cur: currentTemp,
          des: desiredTemp,
          heat: heating ? 100 : 0,
        });
    }

    log.trace({
      currentTemp, desiredTemp, heating, slave,
    }, 'Writing measurement');

    return client.write('temperature')
      .field({
        cur: currentTemp,
        des: desiredTemp,
        heat: heating ? 100 : 0,
        slaveCur: slave.temp,
        slaveHum: slave.hum,
      });
  };

  const getLatestMqttEntry = async () => {
    log.trace('Getting latest mqtt entry');
    client.epoch = 'ms';
    const result = await client.query(INFLUX_MQTT_SERIES)
      .where('topic', INFLUX_MQTT_TOPIC)
      .addFunction('last', 'value');

    assert.isArray(result.results);
    assert.isAbove(result.results.length, 0);
    assert.isArray(result.results[0].series);
    assert.isAbove(result.results[0].series.length, 0);
    assert.isArray(result.results[0].series[0].values);
    assert.isAbove(result.results[0].series[0].values.length, 0);
    const [time, value] = result.results[0].series[0].values[0];

    const returnObject = {
      updated: time,
      temp: value,
    };

    await cache.updateMqttData(returnObject);

    return returnObject;
  };

  return {
    writeMeasurement,
    getLatestMqttEntry,
  };
};
