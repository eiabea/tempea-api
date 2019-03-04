const mockedEnv = require('mocked-env');
const express = require('express');
const chai = require('chai');
const sinon = require('sinon');
const log = require('null-logger');

const { assert } = chai;
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

describe('Status Route Unit', () => {
  let restore;

  before(async () => {
    restore = mockedEnv({
      TEMPEA_SLAVE: 'true',
      EXPRESS_PORT: '3001',
    });
  });

  after(async () => {
    restore();
  });

  it('should fail to get status', async () => {
    delete require.cache[require.resolve('../../../controller/cache.controller')];
    delete require.cache[require.resolve('../../../routes/v1/status.route')];
    delete require.cache[require.resolve('../../../controller/temp.controller')];
    // eslint-disable-next-line global-require
    const CacheController = require('../../../controller/cache.controller')(log);
    // eslint-disable-next-line global-require
    const StatusRoute = require('../../../routes/v1/status.route');
    // eslint-disable-next-line global-require
    const TempController = require('../../../controller/temp.controller');

    const tempController = TempController(log, CacheController);

    const stub = sinon.stub(tempController, 'getCurrentTemp')
      .rejects(new Error('Mocked error'));
    const instance = StatusRoute(log, {
      temp: tempController,
    });

    const app = express();
    app.use('/', instance);
    const response = await chai.request(app).get('/');
    const { body } = response;

    assert.isFalse(body.success);
    assert.isString(body.message);
    assert.isTrue(stub.called);

    stub.restore();
  });
});
