import QyuError from './qyu-error.js';
import { promiseWithResolvers, type PromiseWithResolvers } from './utils/promiseWithResolvers.js';
import { MaybePromise } from './utils/MaybePromise.js';
import { omitNilProps } from './utils/omitNilProps.js';

export { QyuBase, type QyuInputOptions, type JobAddInput, type JobFunction };

class QyuBase {
  isAtMaxConcurrency: boolean;
  isRunningJobChannels: boolean;
  isPaused: boolean;
  opts: NormalizedQyuOptions;
  private whenEmptyDeferred: PromiseWithResolvers<undefined | void>;
  private whenFreeDeferred: PromiseWithResolvers<undefined | void>;
  private jobChannels: Promise<void>[];
  private jobQueue: EnqueuedJobInfo[];

  constructor(opts: QyuInputOptions = {}) {
    this.jobQueue = [];
    this.jobChannels = [];
    this.isAtMaxConcurrency = false;
    this.isRunningJobChannels = false;
    this.isPaused = false;
    this.whenEmptyDeferred = promiseWithResolvers();
    this.whenEmptyDeferred.resolve();
    this.whenFreeDeferred = promiseWithResolvers();
    this.whenFreeDeferred.resolve();
    this.opts = {
      concurrency: 1,
      capacity: Infinity,
      rampUpTime: 0,
      ...omitNilProps(opts),
    };
  }

  set(newOpts: QyuInputOptions): void {
    const oldOpts = this.opts;
    this.opts = {
      ...this.opts,
      ...omitNilProps(newOpts),
    };

    if (oldOpts.concurrency && newOpts.concurrency && newOpts.concurrency > oldOpts.concurrency) {
      this.runJobChannels();
    }

    if (newOpts.capacity) {
      while (this.jobQueue.length > newOpts.capacity) {
        this.jobQueue
          .pop()!
          .deferred.reject(
            new QyuError('ERR_CAPACITY_FULL', "Can't queue job, queue is at max capacity")
          );
      }
    }
  }

  async add<T>(input: JobAddInput<T>): Promise<T>;
  async add<T extends readonly JobAddInput<unknown>[] | readonly []>(
    input: T
  ): Promise<{
    [K in keyof T]: T[K] extends JobAddInput<infer RetVal> ? RetVal : never;
  }>;
  async add<T>(input: JobAddInput<T> | JobAddInput<T>[]): Promise<T | T[]> {
    const normalizeInput = (input: JobAddInput<T>) =>
      typeof input !== 'function'
        ? input
        : {
            fn: input,
            timeout: undefined,
            priority: undefined,
            signal: undefined,
          };

    const result: T | T[] = !Array.isArray(input)
      ? await this.enqueue(normalizeInput(input))
      : await Promise.all(input.map(normalizeInput).map(job => this.enqueue(job)));

    return result;
  }

  async pause(): Promise<undefined | void> {
    if (this.isPaused) {
      return;
    }
    this.isPaused = true;
    if (!this.jobQueue.length && !this.jobChannels.length) {
      this.whenEmptyDeferred = promiseWithResolvers();
    }
    // TODO: return a promise that will resolve when current jobs that were already running will finish. Perhaps: return this.whenEmpty();
    await Promise.all(this.jobChannels);
  }

  resume(): undefined | void {
    if (!this.isPaused) {
      return;
    }
    this.isPaused = false;
    if (!this.jobQueue.length && !this.jobChannels.length) {
      this.whenEmptyDeferred.resolve();
    }
    this.runJobChannels();
  }

  empty(): Promise<void[]> {
    for (const job of this.jobQueue.splice(0)) {
      job.deferred.reject(new QyuError('ERR_JOB_DEQUEUED', 'Job was dequeued out of the queue'));
      guardUnhandledPromiseRejections(job);
    }
    return Promise.all(this.jobChannels);
  }

  whenEmpty(): Promise<undefined | void> {
    return this.whenEmptyDeferred.promise;
  }

  whenFree(): Promise<undefined | void> {
    return this.whenFreeDeferred.promise;
  }

  private enqueue<TJobRes>(params: {
    fn: JobFunction<TJobRes>;
    timeout?: number | undefined;
    priority?: number | undefined;
    signal?: AbortSignal;
  }): Promise<TJobRes> {
    const { fn, timeout, priority, signal } = params;

    const job: EnqueuedJobInfo<TJobRes> = {
      fn,
      deferred: promiseWithResolvers<TJobRes>(),
      timeoutId: undefined,
      opts: {
        timeout: timeout ?? 0,
        priority: priority ?? 0,
      },
    };

    if (this.jobQueue.length === this.opts.capacity) {
      job.deferred.reject(
        new QyuError('ERR_CAPACITY_FULL', "Can't queue job, queue is at max capacity")
      );
      guardUnhandledPromiseRejections(job);
      return job.deferred.promise;
    }

    if (typeof job.opts.timeout === 'number' && job.opts.timeout > 0) {
      job.timeoutId = setTimeout(() => {
        this.dequeue(job.deferred.promise);
        job.deferred.reject(new QyuError('ERR_JOB_TIMEOUT', 'Job cancelled due to timeout'));
        guardUnhandledPromiseRejections(job); // TODO: Does it *really* make sense to swallow this unhandled rejection?
      }, job.opts.timeout);
    }

    if (signal) {
      if (signal.aborted) {
        job.deferred.reject(signal.reason);
        return job.deferred.promise;
      }
      signal.addEventListener('abort', () => {
        this.dequeue(job.deferred.promise);
        job.deferred.reject(signal.reason);
      });
    }

    let i = 0;
    while (i < this.jobQueue.length && job.opts.priority <= this.jobQueue[i].opts.priority) {
      ++i;
    }
    this.jobQueue.splice(i, 0, job);

    this.runJobChannels();

    return job.deferred.promise;
  }

  // TODO: Modify this function to return something more appropriate for publich exposure rather than the internal job structure, and add it a suitable return type annotation
  private dequeue(promise: Promise<unknown>): false | any {
    for (let i = 0; i < this.jobQueue.length; ++i) {
      if (this.jobQueue[i].deferred.promise === promise) {
        const splice = this.jobQueue.splice(i, 1);
        return splice[0];
      }
    }
    return false;
  }

  private async runJobChannel(): Promise<void> {
    let job;
    while (
      !this.isPaused &&
      this.jobChannels.length <= this.opts.concurrency &&
      (job = this.jobQueue.shift())
    ) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
      try {
        const result = await job.fn();
        job.deferred.resolve(result);
      } catch (err) {
        job.deferred.reject(err);
        guardUnhandledPromiseRejections(job);
      }
    }
  }

  private async runJobChannels(): Promise<void> {
    if (this.isRunningJobChannels) {
      return;
    }

    this.isRunningJobChannels = true;

    while (
      this.jobQueue.length &&
      !this.isPaused &&
      this.jobChannels.length < this.opts.concurrency
    ) {
      (async () => {
        // TODO: Add additional condition here: "&& !this.jobQueue.length" for when pause() is engaged while there are still jobs in the jobQueue
        if (!this.jobChannels.length) {
          this.whenEmptyDeferred = promiseWithResolvers();
        }

        if (this.jobChannels.length === this.opts.concurrency - 1) {
          this.whenFreeDeferred = promiseWithResolvers();
        }

        const promise = this.runJobChannel();
        this.jobChannels.push(promise);
        await promise;
        this.jobChannels.splice(this.jobChannels.indexOf(promise), 1);

        if (this.jobChannels.length === this.opts.concurrency - 1) {
          this.whenFreeDeferred.resolve();
        }

        // TODO: Add additional condition here: "&& !this.jobQueue.length" for when pause() is engaged while there are still jobs in the jobQueue
        if (!this.jobChannels.length && !this.isPaused) {
          this.whenEmptyDeferred.resolve();
        }
      })();

      if (this.opts.rampUpTime && this.jobChannels.length) {
        await new Promise(resolve => setTimeout(resolve, this.opts.rampUpTime));
      }
    }

    this.isRunningJobChannels = false;
  }
}

const noop = <T>(val: T): T => val;

// To avoid "Unhandled promise rejections":
const guardUnhandledPromiseRejections = (jobObject: EnqueuedJobInfo) => {
  return jobObject.deferred.promise.catch(noop);
};

interface EnqueuedJobInfo<TRes = unknown> {
  fn: JobFunction<TRes>;
  deferred: PromiseWithResolvers<TRes>;
  timeoutId: ReturnType<typeof setTimeout> | undefined;
  opts: {
    timeout: number | undefined;
    priority: number;
  };
}

type JobFunction<TRes> = () => MaybePromise<TRes>;

type NormalizedQyuOptions = Required<{
  [K in keyof QyuInputOptions]: NonNullable<QyuInputOptions[K]>;
}>;

interface QyuInputOptions {
  concurrency?: number | undefined | null;
  capacity?: number | undefined | null;
  rampUpTime?: number | undefined | null;
}

type JobAddInput<JobResultVal> =
  | JobFunction<JobResultVal>
  | {
      fn: JobFunction<JobResultVal>;
      signal?: AbortSignal;
      timeout?: number | undefined;
      priority?: number | undefined;
    };
