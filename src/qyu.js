const
    stream = require('stream'),
    QyuError = require('./qyu-error'),
    Deferred = require('./deferred');


const noop = v => v;


// To avoid "Unhandled promise rejections":
const guardUnhandledPromiseRejections = jobObject => {
    return jobObject.deferred.promise.catch(noop);
};


const makeQyuProxy = q => {
    return new Proxy(
        function() {
            if (arguments[0] instanceof Array) {
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
            }
        }
    );
};

class Qyu {
    constructor(opts={}, job=null, jobOpts={}) {
        this.getRampUpPromise = null;
        this.jobQueue = [];
        this.jobChannels = [];
        this.activeCount = 0;
        this.isAtMaxConcurrency = false;
        this.isRunningJobChannels = false;
        this.isPaused = false;
        this.whenEmptyDeferred = new Deferred;
        this.whenEmptyDeferred.resolve();
        this.whenFreeDeferred = new Deferred;
        this.whenFreeDeferred.resolve();
        this.opts = {
            concurrency: 1,
            capacity: Infinity,
            rampUpTime: 0,
            ...opts
        };

        if (job) { // TODO: Add this feature in docs...
            this.enqueue(job, jobOpts);
        }

        return makeQyuProxy(this);
    }

    set(newOpts) {
        let oldOpts = this.opts;
        this.opts = { ...this.opts, ...newOpts };

        if (newOpts.concurrency && newOpts.concurrency > oldOpts.concurrency) {
            this.runJobChannels();
        }
    }

    async runJobChannel() {
        let current;
        while (
            !this.isPaused &&
            this.jobChannels.length <= this.opts.concurrency &&
            (current = this.jobQueue.shift())
        ) {
            if (current.timeoutId) {
                clearTimeout(current.timeoutId);
            }
            try {
                let result = await current.job.apply(this, current.opts.args);
                current.deferred.resolve(result);
            }
            catch (err) {
                current.deferred.reject(err);
                guardUnhandledPromiseRejections(current);
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
                        this.whenEmptyDeferred = new Deferred;
                    }

                    if (this.jobChannels.length === this.opts.concurrency - 1) {
                        this.whenFreeDeferred = new Deferred;
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
                    await new Promise(resolve => setTimeout(resolve, this.opts.rampUpTime));
                }
            }

            this.isRunningJobChannels = false;
        }
    }

    enqueue(inputJob, opts={}) {
        let jobObject = {
            job: inputJob,
            opts: {
                timeout: null,
                priority: 0,
                args: null,
                ...opts
            },
            deferred: new Deferred,
            timeoutId: null
        };

        if (this.jobQueue.length === this.opts.capacity) {
            jobObject.deferred.reject(
                new QyuError('ERR_CAPACITY_FULL', "Can't queue job, queue is at max capacity")
            );
            guardUnhandledPromiseRejections(jobObject);
        }

        if (opts.timeout) {
            jobObject.timeoutId = setTimeout(() => {
                this.dequeue(jobObject.deferred.promise);
                jobObject.timeoutId = null;
                jobObject.deferred.reject(
                    new QyuError('ERR_JOB_TIMEOUT', "Job cancelled due to timeout")
                );
                guardUnhandledPromiseRejections(jobObject);
            }, opts.timeout);
        }

        let i = 0;
        while (
            i < this.jobQueue.length && opts.priority <= this.jobQueue[i].opts.priority
        ) { ++i };
        this.jobQueue.splice(i, 0, jobObject);

        this.runJobChannels();

        return jobObject.deferred.promise;
    }

    dequeue(promise) {
        for (let i=0; i<this.jobQueue.length; ++i) {
            if (this.jobQueue[i].deferred.promise === promise) {
                let splice = this.jobQueue.splice(i, 1);
                return splice[0];
            }
        }
        return false;
    }

    add() {
        let job = arguments[0];
        let opts = arguments[1] instanceof Object ? arguments[1] : {args: null};
        if (arguments.length > 2) {
            opts.args = Array.prototype.slice.call(arguments, 2);
        }
        return this.enqueue(job, opts);
    }

    map(iterator, fn, opts) {
        let counter = 0;
        let promises = [];
        for (let item of iterator) {
            promises.push(
                this.add(fn, opts, item, counter++)
            );
        }
        return Promise.all(promises);
    }

    pause() {
        if (this.isPaused) {
            return;
        }
        this.isPaused = true;
        if (!this.jobQueue.length && !this.jobChannels.length) {
            this.whenEmptyDeferred = new Deferred;
        }
        // TODO: return a promise that will resolve when current jobs that were already running will finish. Perhaps: return this.whenEmpty();
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
        this.jobQueue.splice(0);
    }

    whenEmpty() {
        return this.whenEmptyDeferred.promise;
    }

    whenFree() {
        return this.whenFreeDeferred.promise;
    }

    writeStream(chunkObjTransformer=v=>v) {
        let thisQueue = this;
        return new stream.Writable({
            objectMode: true,
            highWaterMark: 0,
            write(obj, encoding, cb) {
                thisQueue.add(chunkObjTransformer, obj);
                thisQueue.whenFree().then(cb);
            },
            final(cb) {
                thisQueue.whenEmpty().then(cb);
            }
        });
    }

    transformStream(chunkObjTransformer=v=>v) {
        let thisQueue = this;
        return new stream.Transform({
            objectMode: true,
            writableHighWaterMark: 0,
            readableHighWaterMark: thisQueue.opts.capacity,
            transform(obj, encoding, cb) {
                let job = () => chunkObjTransformer(obj);
                let jobResolved = jobResult => this.push(jobResult);
                thisQueue.enqueue(job).then(jobResolved, jobResolved);

                // thisQueue.add(chunkObjTransformer, obj);

                thisQueue.whenFree().then(cb);
            },
            flush(cb) {
                thisQueue.whenFree().then(cb);
            }
        });
    }
}

module.exports = Qyu;

Qyu.Error = QyuError;
