const OVERSHOOT_TEMP = parseFloat(process.env.OVERSHOOT_TEMP) || 0.5;

module.exports = (log) => {
  const shouldHeat = (currentTemp, desiredTemp, isHeating) => {
    if (desiredTemp < currentTemp &&
      currentTemp < desiredTemp + OVERSHOOT_TEMP &&
      !isHeating) {
      log.info(
        {
          currentTemp,
          desiredTemp,
          overshoot: OVERSHOOT_TEMP,
        },
        'Room temperature in range, disable heating',
      );

      return false;
    } else if (currentTemp < desiredTemp + OVERSHOOT_TEMP) {
      log.info(
        {
          currentTemp,
          desiredTemp,
          overshoot: OVERSHOOT_TEMP,
        },
        'Room temperature too low, ensure heating',
      );

      return true;
    }

    log.info(
      {
        currentTemp,
        desiredTemp,
        overshoot: OVERSHOOT_TEMP,
      },
      'Room temperature high enough, disabling heating',
    );

    return false;
  };

  return {
    shouldHeat,
  };
};
