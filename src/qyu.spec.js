const { Qyu, QyuError } = require('../index');


const delay = async (time=1000) => {
    await new Promise(resolve => setTimeout(resolve, time));
};

const mockAsync = async (result=true, time=25) => {
    await delay(time);
    return result;
};

const noop = val => val;


describe('When A Qyu instance is invoked as a function', () => {
    it("with a function as the first arg - should internally call the `add` method with the job and options abd injecting any addiontional args passed into it", () => {
        const q = new Qyu();
        const jobOpts = {};
        const spy = jest.spyOn(q, 'add');
        q(noop, jobOpts, 'a', 'b', 'c', 'd');
        expect(spy).toHaveBeenCalledWith(noop, jobOpts, 'a', 'b', 'c', 'd');
    });

    it("with an array as the first arg - should internally call the `map` method with the array, function and options args passed into it", () => {
        const q = new Qyu();
        const arr = [1, 2, 3];
        const jobOpts = {};
        const spy = jest.spyOn(q, 'map');
        q(arr, noop, jobOpts);
        expect(spy).toHaveBeenCalledWith(arr, noop, jobOpts);
    });
});

describe('`add` method', () => {
    it('calls the added functions immediately if currently running jobs are below the concurrency limit', () => {
        let q = new Qyu({concurrency: 2});

        let job1 = jest.fn(mockAsync);
        let job2 = jest.fn(mockAsync);

        q.add(job1);
        q.add(job2);

        expect(job1).toHaveBeenCalled();
        expect(job2).toHaveBeenCalled();
    });

    it('will not call added functions immediately if currently running jobs are at the concurrency limit', () => {
        let q = new Qyu({concurrency: 1});
        let job = jest.fn();

        q.add(mockAsync);
        q.add(job);

        expect(job).not.toHaveBeenCalled();
    });

    it('will inject every 3rd and up additional arguments supplied to it to the job function itself', () => {
        let q = new Qyu();
        let job = jest.fn();
        q.add(job, {}, 'a', 'b' ,'c', 'd');
        expect(job).toHaveBeenCalledWith('a', 'b', 'c', 'd');
    });

    // TODO: This test sometimes seems to experience some timing glitches that makes it fail; refactor it to be more reliable
    it('will delay in starting the next job queued, regardless of concurrency setting, by the specified amount of time if `rampUpTime` is more than zero', async () => {
        let rampUpTime = 100;
        let q = new Qyu({ concurrency: 3, rampUpTime });
        let started = 0;

        q.add(async () => {
            started++;
            await mockAsync(true, 250);
        });
        q.add(async () => {
            started++;
            await mockAsync(true, 250);
        });
        q.add(async () => {
            started++;
            await mockAsync(true, 250);
        });

        await Promise.all([
            (() => {
                expect(started).toBe(1);
            })(),
            (async () => {
                await delay(rampUpTime + 20);
                expect(started).toBe(2);
            })(),
            (async () => {
                await delay(rampUpTime * 2 + 20);
                expect(started).toBe(3);
            })()
        ]);
    });

    describe('should return a', () => {
        it('promise', () => {
            let q = new Qyu({});
            let promise = q.add(() => mockAsync());
            expect(promise instanceof Promise).toBe(true);
        });

        it('that resolves only after the actual job is resolved', async () => {
            let done = false;
            let q = new Qyu({});
            await q.add(async () => {
                await mockAsync();
                done = true;
            });
            expect(done).toBe(true);
        });

        it('and rejects only after the actual job is rejected', async () => {
            let done = false;
            let q = new Qyu({});
            try {
                await q.add(async () => {
                    await mockAsync();
                    done = true;
                    throw new Error;
                });
            } catch (err) {
                expect(done).toBe(true);
            }
        });

        it('with the value the job resolved with', async () => {
            let q = new Qyu({});
            let value = await q.add(async () => {
                return await mockAsync('THE_VALUE');
            });
            expect(value).toBe('THE_VALUE');
        });

        it('or with the value the job rejected with', async () => {
            let q = new Qyu({});
            let value;
            try {
                await q.add(async () => {
                    throw await mockAsync('THE_VALUE');
                });
            } catch (thrown) {
                value = thrown;
            }
            expect(value).toBe('THE_VALUE');
        });
    });
});

describe('`map` method', () => {
    it("invokes the function in the second argument for each item in the first argument array with two arguments in itself: the item and it's index", () => {
        let q = new Qyu({concurrency: 3});
        let items = ['A', 'B', 'C'];
        let fn = jest.fn();

        q.map(items, fn);

        expect(fn).toHaveBeenCalledTimes(3);
        expect(fn).toHaveBeenCalledWith('C', 2);
    });
});

describe('`whenEmpty` method', () => {
    it('should return a promise', () => {
        let q = new Qyu({});
        expect(q.whenEmpty() instanceof Promise).toBe(true);
    });

    it('that resolves once a Qyu instance has no running or queued jobs, regardless if some jobs ended up rejecting', async () => {
        let concurrency = 2;
        let numToRun = 3;
        let startedCount = 0;
        let finishedCount = 0;

        let q = new Qyu({ concurrency });

        for (let i=0; i<numToRun; ++i) {
            q.add(async () => {
                startedCount++;
                await mockAsync();
                finishedCount++;
                if (i % 2 === 1) { // If `i` is odd
                    throw new Error('some_simulated_failure_error');
                }
            });
        }

        await q.whenEmpty();

        expect(startedCount).toBe(numToRun);
        expect(finishedCount).toBe(numToRun);
    });
});

describe('`whenFree` method', () => {
    it('should return a promise', () => {
        let q = new Qyu({});
        expect(q.whenFree() instanceof Promise).toBe(true);
    });

    it('that resolves once currently running jobs get below the concurrency limit', async () => {
        let concurrency = 2;
        let numToRun = 3;
        let startedCount = 0;
        let finishedCount = 0;

        let q = new Qyu({ concurrency });

        for (let i=0; i<numToRun; ++i) {
            q.add(async () => {
                startedCount++;
                await mockAsync();
                finishedCount++;
            });
        }

        await q.whenFree();

        expect(startedCount).toBe(numToRun);
        expect(finishedCount).toBe(2);
    });
});

describe('The `timeout` option, when adding a task', () => {
    it('should cancel a queued job if waits in queue more than the specified time', async () => {
        let q = new Qyu({ concurrency: 1 });
        let fn = jest.fn();

        let promise = new Promise(resolve => {
            q.add(async () => {
                await mockAsync(true, 1000);
                resolve();
            });
        });

        q.add(fn, {timeout: 100});

        await promise;
        await delay(0);

        expect(fn).not.toHaveBeenCalled();
    });

    it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
        let q = new Qyu({ concurrency: 1 });

        q.add(() => mockAsync(true, 1000));

        try {
            await q.add(() => {}, {timeout: 100});
        }
        catch (err) {
            expect(err instanceof QyuError).toBe(true);
            expect(err.code).toBe('ERR_JOB_TIMEOUT');
            return;
        }

        throw new Error('Expected job to reject (due to timeout), instead it resolved');
    });
});

describe('The `priority` option, when adding a task', () => {
    it('if currently running jobs are at the concurrency limit, queue a job AFTER jobs with more or equal priority, and BEFORE other jobs that have less priority if any', async () => {
        let q = new Qyu({ concurrency: 1 });
        let actualOrder = [];
        let push = value => actualOrder.push(value);

        q.add(mockAsync); // To raise activity to max concurrency...

        await Promise.all([
            new Promise(resolve => q.add(() => { push('b'); resolve(); }, {priority: 2})),
            new Promise(resolve => q.add(() => { push('a'); resolve(); }, {priority: 3})),
            new Promise(resolve => q.add(() => { push('d'); resolve(); }, {priority: 1})),
            new Promise(resolve => q.add(() => { push('c'); resolve(); }, {priority: 2}))
        ]);

        expect(actualOrder).toMatchObject(['a', 'b', 'c' ,'d']);
    });
});
