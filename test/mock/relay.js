const MOCK_RELAY_READ_FAIL = process.env.MOCK_RELAY_READ_FAIL === 'true';
const MOCK_RELAY_WRITE_FAIL = process.env.MOCK_RELAY_WRITE_FAIL === 'true';

let state = 0;

function read(callback) {
  if (MOCK_RELAY_READ_FAIL) {
    return callback(new Error('Mocked read error'));
  }
  return callback(null, state);
}

function write(newState, callback) {
  state = newState;

  if (MOCK_RELAY_WRITE_FAIL) {
    return callback(new Error('Mocked write error'));
  }
  return callback(null, state);
}

module.exports = {
  read,
  write,
};
