const QyuError = require('./qyu-error');
const { expect } = require('chai');

describe('MOCHA WRAPPER!!!', () => {
  it('should extend the built-in Error', () => {
    const err = new QyuError();
    expect(err).to.be.instanceOf(Error);
  });

  it('should have a "code" property equal to the 1st constructor parameter passed to it', () => {
    const err = new QyuError('CODE');
    expect(err.code).to.equal('CODE');
  });

  it('should have a "message" property equal to the 2nd constructor parameter passed to it', () => {
    const err = new QyuError('...', 'MESSAGE');
    expect(err.message).to.equal('MESSAGE');
  });
});
