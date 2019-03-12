const mockedEnv = require('mocked-env');
const chai = require('chai');

const { assert } = chai;
const chaiHttp = require('chai-http');
const proxyquire = require('proxyquire');

chai.use(chaiHttp);

describe('Status Route (Slave)', () => {
  let restore;
  let app;
  let expressApp;

  before(async () => {
    restore = mockedEnv({
      TEMPEA_SLAVE: 'true',
      EXPRESS_PORT: '3001',
    });

    const RC = proxyquire.noCallThru().load('../../../controller/relay.controller', {
      onoff: {
        Gpio: function Gpio() {
          function read(callback) {
            return callback(null, 0);
          }

          function write(newState, callback) {
            return callback(null, newState);
          }

          return {
            read,
            write,
          };
        },
      },
    });

    const App = proxyquire.noCallThru().load('../../../app', {
      './controller/relay.controller': RC,
    });

    app = App(60);
    await app.start();
    expressApp = app.getExpressApp();
  });

  after(async () => {
    await app.stop();
    restore();
  });

  it('should get status', async () => {
    const response = await chai.request(expressApp).get('/v1/status');
    const { body } = response;
    const { data } = body;
    const { temp } = data;

    assert.isTrue(body.success);
    assert.isNumber(temp);
  });
});
