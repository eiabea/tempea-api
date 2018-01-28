let state = 0;

function read(callback) {
  callback(null, state);
}

function write(newState, callback) {
  state = newState;
  callback(null, state);
}


module.exports = {
  read,
  write,
};
