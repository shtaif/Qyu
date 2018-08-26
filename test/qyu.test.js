const { Qyu, QyuError } = require('../index');


const mockAsync = async (result=true, time=25) => {
    await new Promise(resolve => setTimeout(resolve, time));
    return result;
};


describe('`add` method', () => {
    it('calls the added functions immediately if currently running jobs are below the concurrency limit', () => {
        let q = new Qyu({concurrency: 2});
        let calledTheSecond = false;
        q.add(async () => {
            await mockAsync();
            expect(calledTheSecond).toBe(true);
        });
        q.add(async () => {
            calledTheSecond = true;
            await mockAsync();
        });
    });

    it('will not call added functions immediately if currently running jobs are at the concurrency limit', () => {
        let q = new Qyu({concurrency: 1});

        let calledTheSecond = false;

        q.add(async () => {
            await mockAsync();
            expect(calledTheSecond).toBe(false);
        });

        q.add(async () => {
            calledTheSecond = true;
        });
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
    it('if currently running jobs are at the concurrency limit, queue a job after jobs with more or equal priority, and before other jobs that have less priority if any', async () => {
        let q = new Qyu({ concurrency: 1 });
        let expectedOrder = ['a', 'b', 'c' ,'d'];
        let actualOrder = [];
        let push = value => actualOrder.push(value);

        q.add(() => mockAsync()); // To raise activity to max concurrency...

        q.add({priority: 2}, () => push('b'));
        q.add({priority: 3}, () => push('a'));
        q.add({priority: 1}, () => push('d'));
        q.add({priority: 2}, () => push('c'));

        await q.whenEmpty();

        for (let i=0; i<actualOrder.length; i++) {
            expect(actualOrder[i]).toBe(expectedOrder[i]);
        }
    });
});
