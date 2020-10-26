import * as bunyan from 'bunyan';

interface Cache {
  master: {
    updated?: Number
    relay?: Number
    current?: Number
  },
  // TODO Use data classes
  desired: any
  slave: any,
  mqtt: any
}

export class CacheController {
  private log: bunyan;

  private cache: Cache = {
    master: {},
    desired: undefined,
    slave: undefined,
    mqtt: undefined
  }

  constructor(log: bunyan) {
    this.log = log;
    this.log.info('Creating cache controller');
  }

  public async invalidate(): Promise<void> {
    this.cache = {
      master: {},
      desired: undefined,
      slave: undefined,
      mqtt: undefined
    };
  };

  public async updateRelayState(state: Number): Promise<Boolean> {
    this.log.trace({ state }, 'Updating relay state');
    this.cache.master.updated = Date.now();
    this.cache.master.relay = state;
    return true;
  };

  public async getRelayState(): Promise<Number> {
    this.log.trace('Getting relay state');
    if (this.cache.master.relay !== undefined) {
      return this.cache.master.relay;
    }

    throw Error('No cached value available');
  };

  public async updateDesiredObject(desired): Promise<Boolean> {
    const desiredTagged = Object.assign(desired, { updated: Date.now() });
    this.log.trace({ desiredTagged }, 'Updating desired temperature');
    this.cache.desired = desiredTagged;
    return true;
  };

  public async getDesiredObject(): Promise<any> {
    this.log.trace('Getting desired temperature');
    if (this.cache.desired) {
      return this.cache.desired;
    }

    throw Error('No cached value available');
  };

  public async updateCurrentTemperature(current): Promise<Boolean> {
    this.log.trace({ current }, 'Updating current temperature');
    this.cache.master.updated = Date.now();
    this.cache.master.current = current;
    return true;
  };

  public async getCurrentTemperature(): Promise<Number> {
    this.log.trace('Getting current temperature');
    if (this.cache.master.current) {
      return this.cache.master.current;
    }

    throw Error('No cached value available');
  };

  public async updateSlaveData(data: any): Promise<Boolean> {
    this.log.trace({ data }, 'Updating slave data');
    const slaveTagged = Object.assign(data, { updated: Date.now() });
    this.cache.slave = slaveTagged;
    return true;
  };

  public async getSlaveData(): Promise<any> {
    this.log.trace('Getting slave data');
    if (this.cache.slave) {
      return this.cache.slave;
    }

    throw Error('No cached value available');
  };

  public async updateMqttData(data: any): Promise<Boolean> {
    // Do not override updated, already present from influx
    this.log.trace({ data }, 'Updating mqtt data');
    this.cache.mqtt = data;
    return true;
  };

  public async getMqttData(): Promise<any> {
    this.log.trace('Getting mqtt data');
    if (this.cache.mqtt) {
      return this.cache.mqtt;
    }

    throw Error('No cached value available');
  };

  public async getMasterUpdated(): Promise<Number> {
    this.log.trace('Getting master updated data');
    if (this.cache.master.updated) {
      return this.cache.master.updated;
    }

    throw Error('No cached value available');
  };
}
