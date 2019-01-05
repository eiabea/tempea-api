function read(callback) {
  return callback(null, 0);
}

function write(newState, callback) {
  return callback(null, newState);
}

module.exports = {
  read,
  write,
};
