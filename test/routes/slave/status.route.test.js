const mockedEnv = require('mocked-env');
const chai = require('chai');

const { assert } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

describe('Status Route', () => {
  let restore;
  let app;
  let expressApp;

  before(async () => {
    restore = mockedEnv({
      TEMPEA_SLAVE: 'true',
      EXPRESS_PORT: '3001',
    });

    delete require.cache[require.resolve('../../../app')];
    // eslint-disable-next-line global-require
    const App = require('../../../app');
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
