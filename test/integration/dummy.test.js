const request = require('request');

describe('Dummy', () => {
  it('Should not fail', (done) => {
    console.log('#############');
    request('http://localhost:3000/v1/status', (error, response, body) => {
      console.log(body);
      done(error);
    });
  });
});
