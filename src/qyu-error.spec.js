const QyuError = require('./qyu-error');

it('should extend the built-in Error', () => {
  let err = new QyuError();
  expect(err instanceof Error).toBe(true);
});

it('should have a "code" property equal to the 1st constructor parameter passed to it', () => {
  let err = new QyuError('CODE');
  expect(err.code).toBe('CODE');
});

it('should have a "message" property equal to the 2nd constructor parameter passed to it', () => {
  let err = new QyuError('...', 'MESSAGE');
  expect(err.message).toBe('MESSAGE');
});
