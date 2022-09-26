const QyuError = require('./qyu-error');
const Deferred = require('./deferred');

const noop = v => v;

// To avoid "Unhandled promise rejections":
const guardUnhandledPromiseRejections = jobObject => {
  return jobObject.deferred.promise.catch(noop);
};

const makeQyuProxy = q => {
  return new Proxy(
    function () {
      if (arguments[0][Symbol.iterator] instanceof Function) {
        return q.map(arguments[0], arguments[1], arguments[2]);
      } else {
        return q.add(...arguments);
      }
    },
    {
      get: (target, prop, receiver) => {
        return q[prop];
      },
      set: (obj, prop, value) => {
        q[prop] = value;
        return true;
      },
    }
  );
};

class Qyu {
  constructor(opts = {}, jobFn = null, jobOpts = {}) {
    this.getRampUpPromise = null;
    this.jobQueue = [];
    this.jobChannels = [];
    this.isAtMaxConcurrency = false;
    this.isRunningJobChannels = false;
    this.isPaused = false;
    this.whenEmptyDeferred = new Deferred();
    this.whenEmptyDeferred.resolve();
    this.whenFreeDeferred = new Deferred();
    this.whenFreeDeferred.resolve();
    this.opts = {
      concurrency: 1,
      capacity: Infinity,
      rampUpTime: 0,
      ...opts,
    };

    if (jobFn) {
      // TODO: Add this feature in docs...
      this.enqueue(jobFn, jobOpts);
    }

    return makeQyuProxy(this);
  }

  set(newOpts) {
    let oldOpts = this.opts;
    this.opts = { ...this.opts, ...newOpts };

    if (newOpts.concurrency && newOpts.concurrency > oldOpts.concurrency) {
      this.runJobChannels();
    }

    if (newOpts.capacity) {
      while (this.jobQueue.length > newOpts.capacity) {
        this.jobQueue
          .pop()
          .deferred.reject(
            new QyuError(
              'ERR_CAPACITY_FULL',
              "Can't queue job, queue is at max capacity"
            )
          );
      }
    }
  }

  async runJobChannel() {
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
        let result = await job.fn.apply(this, job.opts.args);
        job.deferred.resolve(result);
      } catch (err) {
        job.deferred.reject(err);
        guardUnhandledPromiseRejections(job);
      }
    }
  }

  async runJobChannels() {
    if (!this.isRunningJobChannels) {
      this.isRunningJobChannels = true;

      while (
        this.jobQueue.length &&
        !this.isPaused &&
        this.jobChannels.length < this.opts.concurrency
      ) {
        (async () => {
          // TODO: Add additional condition here: "&& !this.jobQueue.length" for when pause() is engaged while there are still jobs in the jobQueue
          if (!this.jobChannels.length) {
            this.whenEmptyDeferred = new Deferred();
          }

          if (this.jobChannels.length === this.opts.concurrency - 1) {
            this.whenFreeDeferred = new Deferred();
          }

          let promise = this.runJobChannel();
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
          await new Promise(resolve =>
            setTimeout(resolve, this.opts.rampUpTime)
          );
        }
      }

      this.isRunningJobChannels = false;
    }
  }

  enqueue(fn, opts = {}) {
    let job = {
      fn: fn,
      opts: {
        timeout: null,
        priority: 0,
        args: null,
        ...opts,
      },
      deferred: new Deferred(),
      timeoutId: null,
    };

    if (this.jobQueue.length === this.opts.capacity) {
      job.deferred.reject(
        new QyuError(
          'ERR_CAPACITY_FULL',
          "Can't queue job, queue is at max capacity"
        )
      );
      guardUnhandledPromiseRejections(job);
      return job.deferred.promise;
    }

    if (opts.timeout) {
      job.timeoutId = setTimeout(() => {
        this.dequeue(job.deferred.promise);
        job.timeoutId = null;
        job.deferred.reject(
          new QyuError('ERR_JOB_TIMEOUT', 'Job cancelled due to timeout')
        );
        guardUnhandledPromiseRejections(job);
      }, opts.timeout);
    }

    let i = 0;
    while (
      i < this.jobQueue.length &&
      job.opts.priority <= this.jobQueue[i].opts.priority
    ) {
      ++i;
    }
    this.jobQueue.splice(i, 0, job);

    this.runJobChannels();

    return job.deferred.promise;
  }

  dequeue(promise) {
    for (let i = 0; i < this.jobQueue.length; ++i) {
      if (this.jobQueue[i].deferred.promise === promise) {
        let splice = this.jobQueue.splice(i, 1);
        return splice[0];
      }
    }
    return false;
  }

  add() {
    let fn = arguments[0];
    let opts = arguments[1] instanceof Object ? arguments[1] : { args: null };
    if (arguments.length > 2) {
      opts.args = Array.prototype.slice.call(arguments, 2);
    }
    return this.enqueue(fn, opts);
  }

  map(iterator, fn, opts) {
    let counter = 0;
    let promises = [];
    for (let item of iterator) {
      promises.push(this.add(fn, opts, item, counter++));
    }
    return Promise.all(promises);
  }

  pause() {
    if (this.isPaused) {
      return;
    }
    this.isPaused = true;
    if (!this.jobQueue.length && !this.jobChannels.length) {
      this.whenEmptyDeferred = new Deferred();
    }
    // TODO: return a promise that will resolve when current jobs that were already running will finish. Perhaps: return this.whenEmpty();
    return Promise.all(this.jobChannels);
  }

  resume() {
    if (!this.isPaused) {
      return;
    }
    this.isPaused = false;
    if (!this.jobQueue.length && !this.jobChannels.length) {
      this.whenEmptyDeferred.resolve();
    }
    this.runJobChannels();
  }

  empty() {
    for (let job of this.jobQueue.splice(0)) {
      job.deferred.reject(
        new QyuError('ERR_JOB_DEQUEUED', 'Job was dequeued out of the queue')
      );
      guardUnhandledPromiseRejections(job);
    }
    return Promise.all(this.jobChannels);
  }

  whenEmpty() {
    return this.whenEmptyDeferred.promise;
  }

  whenFree() {
    return this.whenFreeDeferred.promise;
  }
}

module.exports = Qyu;

Qyu.Error = QyuError;
