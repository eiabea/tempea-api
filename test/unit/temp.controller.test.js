const { expect } = require('chai');
const log = require('null-logger');

const TempController = require('../../controller/temp.controller')(log);

describe('Temp Controller', () => {
  it('should get current temperature', async () => {
    const temp = await TempController.getCurrentTemp();

    expect(temp).to.equal(21);
  });
});
