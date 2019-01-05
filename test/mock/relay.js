let state = 0;

function read(callback) {
  return callback(null, state);
}

function write(newState, callback) {
  state = newState;

  return callback(null, state);
}

module.exports = {
  read,
  write,
};
