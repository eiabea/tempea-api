const MOCK_TEMP_FAIL = process.env.MOCK_TEMP_FAIL === 'true';
const MOCK_TEMP_RESET = process.env.MOCK_TEMP_RESET === 'true';

function temperature(sensorID, callback) {
  if (MOCK_TEMP_FAIL) {
    return callback(new Error('Mocked read error'));
  }
  if (MOCK_TEMP_RESET) {
    return callback(null, 85);
  }
  return callback(null, 21);
}

module.exports = {
  temperature,
};
