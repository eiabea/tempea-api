import { assert, expect } from "chai";
import * as log from 'null-logger';

import { CacheController, TempController } from '../../controller';

import { ImportMock } from 'ts-mock-imports';
import * as ds18b20 from 'ds18b20';

const cacheController = new CacheController(log);

describe('Temp Controller', () => {
  beforeEach(ImportMock.restore)
  it('should get current temperature', async () => {
    const stub = ImportMock.mockFunction(ds18b20, 'temperature');
    stub.callsArgWith(1, null, 21)

    const instance = new TempController(log, cacheController);

    const temp = await instance.getCurrentTemp();

    expect(temp).to.equal(21);
  });

  it('should get previous temperature', async () => {
    const stub = ImportMock.mockFunction(ds18b20, 'temperature');
    stub.callsArgWith(1, null, 85);

    const instance = new TempController(log, cacheController);

    const temp = await instance.getCurrentTemp();

    expect(temp).to.equal(20);

    assert.isTrue(stub.called);
  });

  it('should fail to get temperature', async () => {
    const stub = ImportMock.mockFunction(ds18b20, 'temperature');
    stub.callsArgWith(1, new Error('Mocked temp error'));

    const instance = new TempController(log, cacheController);

    try {
      await instance.getCurrentTemp();
    } catch (err) {
      assert.isDefined(err);
    }

    assert.isTrue(stub.called);
  });
});
