import QyuBase, { QyuInputOptions, JobFunction } from './QyuBase';
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

type Qyu = QyuBase & QyuAddMethodType & QyuMapMethodType;

function makeQyuSelfInvokable(q: QyuBase): Qyu {
  const qyuAsAny = q as any;
  return new Proxy(
    (async (...args: any[]) => {
      return args[0][Symbol.iterator] instanceof Function
        ? qyuAsAny.map(args[0], args[1], args[2])
        : qyuAsAny.add(...args);
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

type QyuAddMethodType = {
  <JobResultType>(
    jobFn: JobFunction<JobResultType>,
    opts?:
      | {
          timeout?: number | null | undefined;
          priority?: number | null | undefined;
        }
      | undefined
      | null
  ): Promise<JobResultType>;
};

type QyuMapMethodType = {
  <IterableVal, JobResultType>(
    iterable: Iterable<IterableVal>,
    iterableMapFn: (
      item: IterableVal,
      idx: number
    ) => MaybePromise<JobResultType>,
    opts?:
      | {
          timeout?: number | null | undefined;
          priority?: number | null | undefined;
        }
      | undefined
      | null
  ): Promise<JobResultType[]>;
};

export { QyuInvokable as default, QyuInputOptions };

/*
  TODOs:
  - Go through entire `README.md`, most importantly probably convert all imports from `require`s to `import` statements
  - Possibly replace all the initial `null` values all around here into `undefined`
  - Make all nullable numeric options to be defaulted to `Infinity` to normalize all operations on them and their type checks
  - Make up and extract out subtypes of the QyuError for each possible error
  - Should I drop the current support for Node.js 7.6.0 in favor of 10.x.x something?
  - Upgrade prettier
  - Devise and publicly expose a proper way to dequeue jobs
*/
