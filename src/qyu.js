const
    stream = require('stream'),
    Promise = require('bluebird'),
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
                return q.add(arguments[0], arguments[1]);
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
        this.jobObjects = [];
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
        };
        this.set(opts);

        if (job) {
            this.enqueue(job, jobOpts);
        }

        return makeQyuProxy(this);
    }

    set(newOpts) {
        Object.assign(this.opts, newOpts);
    }

    async runJobChannel() {
        ++this.activeCount;

        this.isAtMaxConcurrency = this.activeCount === this.opts.concurrency;

        if (this.isAtMaxConcurrency) {
            this.whenFreeDeferred = new Deferred;
        }

        var current;
        while (!this.isPaused && (current = this.jobObjects.shift())) {
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

        if (this.isAtMaxConcurrency) {
            this.whenFreeDeferred.resolve();
        }

        --this.activeCount;

        if (!this.activeCount) {
            this.whenEmptyDeferred.resolve();
        }
    }

    async runJobChannels() {
        if (!this.isRunningJobChannels) {
            this.isRunningJobChannels = true;
            if (this.activeCount === 0) {
                this.whenEmptyDeferred = new Deferred;
            }
            for (let l=this.opts.concurrency-this.activeCount, i=0; i<l; ++i) {
                this.runJobChannel();
                if (this.opts.rampUpTime) {
                    await new Promise(resolve => setTimeout(resolve, this.opts.rampUpTime));
                }
            }
            this.isRunningJobChannels = false;
        }
    }

    enqueue(inputJobs, opts={}) {
        opts = {
            timeout: null,
            priority: 0,
            args: null,
            ...opts
        };

        let jobObjects = [];
        for (let inputJob of (typeof inputJobs === 'function'? [inputJobs] : inputJobs)) {
            jobObjects.push({
                job: inputJob,
                opts: opts,
                deferred: new Deferred,
                timeoutId: null
            });
        }

        let freeSlots = this.opts.capacity - this.jobObjects.length;

        for (let i=freeSlots; i<jobObjects.length; ++i) {
            jobObjects[i].deferred.reject(
                new QyuError('ERR_CAPACITY_FULL', "Can't queue job, queue is at max capacity")
            );
            guardUnhandledPromiseRejections(jobObjects[i]);
        }

        let i = 0;
        while (
            i < this.jobObjects.length && opts.priority <= this.jobObjects[i].opts.priority
        ) { ++i };
        this.jobObjects.splice(i, 0, ...jobObjects.slice(0, freeSlots));

        if (opts.timeout) {
            for (let jobObject of jobObjects) {
                jobObject.timeoutId = setTimeout(() => {
                    this.dequeue(jobObject.deferred.promise);
                    jobObject.timeoutId = null;
                    jobObject.deferred.reject(
                        new QyuError('ERR_JOB_TIMEOUT', "Job cancelled due to timeout")
                    );
                    guardUnhandledPromiseRejections(jobObject);
                }, opts.timeout);
            }
        }

        if (!this.isPaused) {
            this.runJobChannels();
        }

        if (inputJobs instanceof Array) {
            return Promise.all(
                jobObjects.map(jobObject => jobObject.deferred.promise)
            );
        } else {
            return jobObjects[0].deferred.promise;
        }
    }

    dequeue(promise) {
        for (let i=0; i<this.jobObjects.length; ++i) {
            if (this.jobObjects[i].deferred.promise === promise) {
                let splice = this.jobObjects.splice(i, 1);
                return splice[0];
            }
        }
        return false;
    }

    add() {
        let job = arguments[0];
        let opts;
        if (arguments[1] instanceof Object) {
            opts = arguments[1];
        } else {
            opts = {args: null};
        }
        if (arguments.length > 2) {
            opts.args = new Array(arguments.length - 2);
            for (let i=2, l=arguments.length; i<l; ++i) {
                opts.args[i] = arguments[i];
            }
        }
        return this.enqueue(job, opts);
    }

    map(iterator, fn) {
        let counter = 0;
        let promises = [];
        for (let item of iterator) {
            promises.push(
                this.add(() => fn(item, counter++))
            );
        }
        return Promise.all(promises);
    }

    pause() {
        this.isPaused = true;
        // TODO: return a promise that will resolve when current jobs that were already running will finish. Perhaps: return this.whenEmpty();
    }

    resume() {
        this.isPaused = false;
        this.runJobChannels();
    }

    empty() {
        this.jobObjects.splice(0);
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
