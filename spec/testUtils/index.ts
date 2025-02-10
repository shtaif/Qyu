async function getPromiseStatus(input: Promise<unknown>): Promise<NamedPromiseStatus>;
async function getPromiseStatus(input: Promise<unknown>[]): Promise<NamedPromiseStatus[]>;
async function getPromiseStatus(input: Promise<unknown> | Promise<unknown>[]): Promise<any> {
  const wasInputArray = input instanceof Array;

  const inputArray = new Array<Promise<unknown>>().concat(input);

  const statuses: NamedPromiseStatus[] = inputArray.map(() => 'pending');

  inputArray.forEach(async (promise, i) => {
    statuses[i] = await promise.then(
      () => 'resolved',
      () => 'rejected'
    );
  });

  await delay(0);

  return wasInputArray ? statuses : statuses[0];
}

type NamedPromiseStatus = 'pending' | 'resolved' | 'rejected';

// TODO: Try to replace every test using this provided with a `time` into a proper time-mocked test
async function mockAsyncFn<T = undefined>(
  ...args: [time?: number | undefined] | [time: number | undefined, result: T]
): Promise<T> {
  let result;
  let time;
  if (args.length === 0) {
    time = 0;
    result = undefined;
  } else if (args.length === 1) {
    time = args[0];
    result = undefined;
  } else {
    time = args[0];
    result = args[1];
  }
  await delay(time);
  return result as T;
}

async function delay(time: number = 0): Promise<void | undefined> {
  await new Promise(resolve => setTimeout(resolve, time));
}

const noop = <T>(val: T | void, ..._whatever: any[]): T | void => val;

export { getPromiseStatus, mockAsyncFn, delay, noop };
