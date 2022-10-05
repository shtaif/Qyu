import QyuBase, { QyuInputOptions, JobAddInput } from './QyuBase';
import MaybePromise from './utils/MaybePromise';

const QyuInvokable = class Qyu extends QyuBase {
  constructor(opts: QyuInputOptions = {}) {
    super(opts);
    const selfInvokableQyu = makeQyuSelfInvokable(this);
    return selfInvokableQyu;
  }
} as {
  new (opts?: QyuInputOptions): Qyu;
};

function makeQyuSelfInvokable(q: QyuBase): Qyu {
  const qyuAsAny = q as any;
  return new Proxy(
    (async (input: any) => {
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
}

type Qyu = QyuBase & QyuAddMethodType;

type QyuAddMethodType = {
  <T>(input: JobAddInput<T>): Promise<T>;

  <T extends readonly JobAddInput<unknown>[] | readonly []>(input: T): Promise<{
    [K in keyof T]: T[K] extends JobAddInput<infer RetVal> ? RetVal : never;
  }>;
};

export { QyuInvokable as default, QyuInputOptions };

/*
  TODOs:
  - Upgrade prettier
  - Possibly replace all the initial `null` values all around here into `undefined`
  - Go through entire `README.md`, most importantly probably convert all imports from `require`s to `import` statements
  - Make all nullable numeric options to be defaulted to `Infinity` to normalize all operations on them and their type checks
  - Make up and extract out subtypes of the QyuError for each possible error
  - Should I drop the current support for Node.js 7.6.0 in favor of 10.x.x something?
  - Devise and publicly expose a proper way to dequeue jobs
*/
