async function getPromiseStatus(input) {
  let wasInputArray = input instanceof Array;

  if (!wasInputArray) {
    input = [input];
  }

  let statuses = [...input].fill('pending');

  input.forEach(async (promise, i) => {
    try {
      await promise;
      statuses[i] = 'resolved';
    } catch (err) {
      statuses[i] = 'rejected';
    }
  });

  await delay(0);

  return wasInputArray ? statuses : statuses[0];
}

async function mockAsyncFn(result = true, time) {
  await delay(time);
  return result;
}

async function delay(time) {
  await new Promise(resolve => setTimeout(resolve, time));
}

const noop = val => val;

module.exports = {
  getPromiseStatus,
  mockAsyncFn,
  delay,
  noop,
};
