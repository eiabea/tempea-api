const mockedEnv = require('mocked-env');
const { assert, expect } = require('chai');
const log = require('null-logger');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const CacheController = require('../../controller/cache.controller')(log);
// Preload files
require('../../controller/calendar.controller');

describe('Calendar Controller', () => {
  let restore;
  beforeEach(() => {
    delete require.cache[require.resolve('../../controller/calendar.controller')];
  });

  afterEach(() => {
    restore();
  });

  it('should return MIN_TEMP [wrong provider]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'wrong',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const CC = proxyquire('../../controller/calendar.controller', {});

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
  });

  it('should return MIN_TEMP [no event, nextcloud]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns(null);
    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  it('should return MIN_TEMP [no event, google]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'google',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns(null);
    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/google': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  /**
   * Summary only has one ';'
   */
  it('should return desired temperature [invalid prio]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: '21;5',
    });
    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(21);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  /**
   * Summary has correct number of parameters, but the sum of
   * the prioritization elements is not 100
   */
  it('should return desired temperature [invalid prio sum]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: '21;5;5',
    });
    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(21);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  /**
   * Summary contains a string
   */
  it('should return MIN_TEMP [summary is a string]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: 'IAmAString',
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(15);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  /**
   * Summary is correct, but the value is way above the MAX_TEMP
   */
  it('should return MAX_TEMP [temperature above MAX_TEMP]', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: '42',
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(27);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });

  it('should return desired temperature with prio', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: '21;50;50',
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(21);
    expect(desiredObj.master).to.equal(50);
    expect(desiredObj.slave).to.equal(50);
    assert.isTrue(getCurrentEventStub.called);
  });

  it('should return desired temperature without prio', async () => {
    restore = mockedEnv({
      TEMPEA_CALENDAR_PROVIDER: 'nextcloud',
      MAX_TEMP: '27',
      MIN_TEMP: '15',
    });

    const getCurrentEventStub = sinon.stub().returns({
      summary: '21',
    });

    const CC = proxyquire('../../controller/calendar.controller', {
      './calendar/nextcloud': () => ({
        getCurrentEvent: getCurrentEventStub,
      }),
    });

    const desiredObj = await CC(log, CacheController)
      .getDesiredObject();

    expect(desiredObj.temp).to.equal(21);
    expect(desiredObj.master).to.equal(100);
    expect(desiredObj.slave).to.equal(0);
    assert.isTrue(getCurrentEventStub.called);
  });
});
