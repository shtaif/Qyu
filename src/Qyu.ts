import { QyuBase, type QyuInputOptions, type JobAddInput } from './QyuBase.js';

export { QyuInvokable as default, type QyuInputOptions };

const QyuInvokable = class Qyu extends QyuBase {
  constructor(opts: QyuInputOptions = {}) {
    super(opts);
    const qyuAsAny = this as any;
    const selfInvokableQyu = new Proxy(
      ((input: any) => {
        return qyuAsAny.add(input);
      }) as any,
      {
        get: (_target, prop, _receiver) => {
          return qyuAsAny[prop];
        },
        set: (_obj, prop, value) => {
          qyuAsAny[prop] = value;
          return true;
        },
      }
    );
    return selfInvokableQyu;
  }
} as {
  new (opts?: QyuInputOptions): Qyu;
};

type Qyu = QyuBase & {
  <T>(input: JobAddInput<T>): Promise<T>;

  <T extends readonly JobAddInput<unknown>[] | readonly []>(
    input: T
  ): Promise<{
    [K in keyof T]: T[K] extends JobAddInput<infer RetVal> ? RetVal : never;
  }>;
};

/*
  TODOs:
  - Possibly replace all the initial `null` values all around here into `undefined`
  - Go through entire `README.md`, most importantly probably convert all imports from `require`s to `import` statements
  - Make all nullable numeric options to be defaulted to `Infinity` to normalize all operations on them and their type checks
  - Make up and extract out subtypes of the QyuError for each possible error
  - Should I drop the current support for Node.js 7.6.0 in favor of 10.x.x something?
  - Devise and publicly expose a proper way to dequeue jobs
*/
