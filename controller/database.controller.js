const Influx = require('influxdb-nodejs');

const INFLUX_URI = `http://${process.env.INFLUX_HOST || 'influx'}:${
  process.env.INFLUX_PORT || '8086'}/${
  process.env.INFLUX_DB || 'temp'}`;

module.exports = (log) => {
  log.info('Creating influx client');
  const client = new Influx(INFLUX_URI);

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
