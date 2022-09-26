import QyuBase, { QyuInputOptions } from './QyuBase';
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
  <JobReturnVal, JobArgs extends any[]>(
    jobFn: JobFunction<JobReturnVal, JobArgs>,
    opts?:
      | {
          timeout?: number | null | undefined;
          priority?: number | null | undefined;
        }
      | undefined
      | null,
    ...jobArgs: JobArgs
  ): Promise<JobReturnVal>;
};

type QyuMapMethodType = {
  <IterableVal, JobReturnVal>(
    iterable: Iterable<IterableVal>,
    iterableMapFn: (
      item: IterableVal,
      idx: number
    ) => MaybePromise<JobReturnVal>,
    opts?:
      | {
          timeout?: number | null | undefined;
          priority?: number | null | undefined;
        }
      | undefined
      | null
  ): Promise<JobReturnVal[]>;
};

type JobFunction<ReturnVal, FuncArgs extends any[] = any[]> = (
  ...args: FuncArgs
) => MaybePromise<ReturnVal>;

export default QyuInvokable;

/*
  TODOs:
  - Refactor all `let` declarations into `const`s where applicable
  - Possibly replace all the initial `null` values all around here into `undefined`
  - Make all nullable numeric options to be defaulted to `Infinity` to normalize all operations on them and their type checks
  - Make up and extract out subtypes of the QyuError for each possible error
  - Should I drop the current support for Node.js 7.6.0 in favor of 10.x.x something?
  - Upgrade prettier
  - Add an eslint check to the `code-check` script (also seems like `eslint` dep is missing to begin with)
*/
