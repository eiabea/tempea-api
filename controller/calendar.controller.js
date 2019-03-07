const { assert } = require('chai');

const GoogleController = require('./calendar/google');
const NextcloudController = require('./calendar/nextcloud');

const TEMPEA_CALENDAR_PROVIDER = process.env.TEMPEA_CALENDAR_PROVIDER || 'none';

const MAX_TEMP = parseFloat(process.env.MAX_TEMP) || 27;
const MIN_TEMP = parseFloat(process.env.MIN_TEMP) || 15;

module.exports = (log, cache) => {
  const googleController = GoogleController(log);
  const nextcloudController = NextcloudController(log);

  const getDesiredObject = async () => {
    log.trace('getDesiredObject');

    let event;

    switch (TEMPEA_CALENDAR_PROVIDER) {
      case 'nextcloud':
        event = await nextcloudController.getCurrentEvent();
        break;
      case 'google':
        event = await googleController.getCurrentEvent();
        break;
      default:
        log.error({ provider: TEMPEA_CALENDAR_PROVIDER }, 'Unknown calendar provider');
        break;
    }

    if (!event) {
      return {
        temp: MIN_TEMP,
        master: 100,
        slave: 0,
      };
    }

    let desiredObj = {};
    try {
      const prioArray = event.summary.split(';');
      if (prioArray.length === 3) {
        desiredObj = {
          temp: parseFloat(prioArray[0]),
          master: parseFloat(prioArray[1]),
          slave: parseFloat(prioArray[2]),
        };

        const prioSum = desiredObj.master + desiredObj.slave;
        if (prioSum !== 100) {
          log.warn({ prioSum }, 'The sum does not equal 100%, falling back to 100%');
          desiredObj = {
            temp: parseFloat(prioArray[0]),
            master: 100,
            slave: 0,
          };
        }
      } else {
        desiredObj = {
          temp: parseFloat(event.summary),
          master: 100,
          slave: 0,
        };
      }

      assert.isNotNaN(desiredObj.temp);
      assert.isNotNaN(desiredObj.master);
      assert.isNotNaN(desiredObj.slave);
    } catch (e) {
      log.error({ e }, 'Unable to parse, fallback to MIN_TEMP');
      desiredObj = {
        temp: MIN_TEMP,
        master: 100,
        slave: 0,
      };
    }

    if (desiredObj.temp > MAX_TEMP) {
      desiredObj = {
        temp: MAX_TEMP,
        master: 100,
        slave: 0,
      };
    }

    await cache.updateDesiredObject(desiredObj);

    return desiredObj;
  };

  return {
    getDesiredObject,
  };
};
