import { assert } from 'chai';
import axios from 'axios';
import * as bunyan from 'bunyan';

import { CacheController } from './';

export class SlaveController {
  private cache: CacheController;
  private log: bunyan;

  constructor(log: bunyan, cache: CacheController) {
    this.log = log;
    this.log.info('Creating slave controller');
    this.cache = cache;
  }

  public async getData() {
    const {
      SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT,
    } = process.env;

    this.log.trace({ SLAVE_HOST, SLAVE_PORT, SLAVE_ENDPOINT }, 'Getting data from slave');
    try {
      const response = await axios.get(`http://${SLAVE_HOST}:${SLAVE_PORT}${SLAVE_ENDPOINT}`);

      const { data } = response;

      assert.isTrue(data.success);
      assert.isDefined(data.data);
      assert.isNumber(data.data.temp);

      await this.cache.updateSlaveData(data.data);
      return data.data;
    } catch (error) {
      this.log.error({ error }, `Error getting data from slave ${SLAVE_HOST}`);
      throw error;
    }
  }
}