const { Qyu, QyuError } = require('../index');


const delay = async (time=1000) => {
    await new Promise(resolve => setTimeout(resolve, time));
};

const mockAsync = async (result=true, time=25) => {
    await delay(time);
    return result;
};



describe('When A Qyu instance is invoked as a function', () => {
    it("should behave exactly like calling it's `add` method", () => {
        // ...
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

    it('will not call added functions immediately if currently running jobs are at the concurrency limit', async () => {
        let q = new Qyu({concurrency: 1});
        let job = jest.fn();

        q.add(mockAsync);
        q.add(job);

        expect(job).not.toHaveBeenCalled();
    });

    it('will delay in starting the next job queued, regardless of concurrency setting, by the specified amount of time if `rampUpTime` is more than zero', async () => {
        let rampUpTime = 100;
        let q = new Qyu({ concurrency: 3, rampUpTime });
        let started = 0;

        q.add(async () => {
            started++;
            await mockAsync(true, 500);
        });
        q.add(async () => {
            started++;
            await mockAsync(true, 500);
        });
        q.add(async () => {
            started++;
            await mockAsync(true, 500);
        });

        await Promise.all([
            (() => {
                expect(started).toBe(1);
            })(),

            (async () => {
                await delay(rampUpTime + 5);
                expect(started).toBe(2);
            })(),

            (async () => {
                await delay(rampUpTime * 2 + 5);
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
    // it("invokes the second argument for each item in the first argument with two arguments in itself: the item and it's index", () => {
    it("...", () => {
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
    it('should dequeue a job if waits in queue more than the specified time', async () => {
        let q = new Qyu({ concurrency: 1 });
        let called = false;

        q.add(() => mockAsync(true, 1000));

        q.add({timeout: 100}, () => called = true);

        await q.whenEmpty();

        expect(called).toBe(false);
    });

    it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
        let q = new Qyu({ concurrency: 1 });

        q.add(() => mockAsync(true, 1000));

        try {
            await q.add({timeout: 100}, () => {});
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

        q.add(() => mockAsync()); // To raise activity to max concurrency...

        q.add({priority: 2}, () => push('b'));
        q.add({priority: 3}, () => push('a'));
        q.add({priority: 1}, () => push('d'));
        q.add({priority: 2}, () => push('c'));

        await q.whenEmpty();

        expect(actualOrder).toMatchObject(['a', 'b', 'c' ,'d']);
    });
});
