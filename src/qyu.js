const
    stream = require('stream'),
    Promise = require('bluebird'),
    QyuError = require('./qyu-error'),
    Deferred = require('./deferred');


const noop = v => v;


// To avoid "Unhandled promise rejections":
const guardUnhandledPromiseRejections = jobObject => {
    jobObject.deferred.promise.catch(noop);
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

    add(/*...*/) {
        let job;
        let opts;
        let firstIndexOfArgs;
        if (typeof arguments[0] === 'function') {
            job = arguments[0];
            opts = {args: null};
            firstIndexOfArgs = 1;
        } else if (typeof arguments[1] === 'function') {
            opts = arguments[0];
            job = arguments[1];
            firstIndexOfArgs = 2;
        }
        opts.args = [];
        for (let i=firstIndexOfArgs, l=arguments.length; i<l; ++i) {
            opts.args.push(arguments[i]);
        }
        return this.enqueue(job, opts);
    }

    pause() {
        this.isPaused = true;
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
