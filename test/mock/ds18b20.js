const { MOCK_TEMP_FAIL, MOCK_TEMP_RESET } = process.env;

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
