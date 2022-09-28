import { expect } from 'chai';
import sinon from 'sinon';
import { Qyu, QyuError } from '.';
import { mockAsyncFn, delay, noop } from './testUtils';

describe('When A Qyu instance is invoked as a function', () => {
  it('with a function as the first arg - should internally call the `add` method with the job and options', () => {
    const q = new Qyu();
    const jobOpts = {};
    const addSpied = (q.add = sinon.spy()); // `sinon.spy(q, 'add')` doesn't work because `q` is a Proxy object
    q(noop, jobOpts);
    expect(addSpied.firstCall.args).to.deep.equal([noop, jobOpts]);
  });

  it('with an array as the first arg - should internally call the `map` method with the array, function and options args passed into it', () => {
    const q = new Qyu();
    const arr = [1, 2, 3];
    const jobOpts = {};
    const mapSpied = (q.map = sinon.spy()); // `sinon.spy(q, 'map') doesn't work because `q` is a Proxy object
    q(arr, noop, jobOpts);
    expect(mapSpied.firstCall.args).to.deep.equal([arr, noop, jobOpts]);
  });
});

describe('`add` method', () => {
  it('calls the added functions immediately if currently running jobs are below the concurrency limit', () => {
    const q = new Qyu({ concurrency: 2 });
    const job1 = sinon.spy(mockAsyncFn);
    const job2 = sinon.spy(mockAsyncFn);
    q.add(job1);
    q.add(job2);
    expect(job1.calledOnce).to.be.true;
    expect(job2.calledOnce).to.be.true;
  });

  it('will not call added functions immediately if currently running jobs are at the concurrency limit', () => {
    const q = new Qyu({ concurrency: 1 });
    const job = sinon.spy();
    q.add(mockAsyncFn);
    q.add(job);
    expect(job.notCalled).to.be.true;
  });

  it('will not call added functions if they exceed the capacity limit', () => {
    const q = new Qyu({ concurrency: 1, capacity: 1 });
    const job1 = sinon.spy(mockAsyncFn);
    const job2 = sinon.spy(mockAsyncFn);
    q.add(job1);
    q.add(job2);
    expect(job1.calledOnce).to.be.true;
    expect(job2.notCalled).to.be.true;
  });

  // TODO: This test sometimes seems to experience some timing glitches that make it flakey; refactor it to be more reliable
  it('will delay in starting the next job queued, regardless of concurrency setting, by the specified amount of time if `rampUpTime` is more than zero', async () => {
    const rampUpTime = 100;
    const q = new Qyu({
      concurrency: 3,
      rampUpTime,
    });
    const job1 = sinon.spy(() => mockAsyncFn(undefined, 250));
    const job2 = sinon.spy(() => mockAsyncFn(undefined, 250));
    const job3 = sinon.spy(() => mockAsyncFn(undefined, 250));
    q.add(job1);
    q.add(job2);
    q.add(job3);
    expect(job1.calledOnce).to.be.true;
    expect(job2.calledOnce).to.be.false;
    expect(job3.calledOnce).to.be.false;
    await delay(rampUpTime + 20);
    expect(job2.calledOnce).to.be.true;
    expect(job3.calledOnce).to.be.false;
    await delay(rampUpTime + 20);
    expect(job3.calledOnce).to.be.true;
  });

  describe('should return a', () => {
    it('promise', () => {
      const q = new Qyu({});
      const promise = q.add(mockAsyncFn);
      expect(promise instanceof Promise).to.be.true;
      expect(promise).to.be.instanceof(Promise);
    });

    it('rejects immediately with a QyuError of code "ERR_CAPACITY_FULL" if instance capacity is full', async () => {
      const q = new Qyu({ capacity: 1 });

      q.add(mockAsyncFn);
      q.add(mockAsyncFn); // this queuing and the one above it fill the queue length up to 1 (the earlier was called immediately, and the current is then put in queue)
      const promise = q.add(mockAsyncFn); // this is expected to reject since the current length of queue should be 1 at that point, which equals to the max capacity of 1

      const err = await expect(promise).to.be.rejected;
      expect(err).to.be.instanceof(QyuError);
      expect(err.code).to.equal('ERR_CAPACITY_FULL');
    });

    it('that resolves only after the actual job is resolved', async () => {
      const q = new Qyu({});
      let done = false;

      const promise = q.add(async () => {
        await mockAsyncFn();
        done = true;
      });

      await expect(promise).to.be.fulfilled;
      expect(done).to.be.true;
    });

    it('and rejects only after the actual job is rejected', async () => {
      const q = new Qyu({});
      let done = false;

      const promise = q.add(async () => {
        await mockAsyncFn();
        done = true;
        throw new Error();
      });

      await expect(promise).to.be.rejected;
      expect(done).to.be.true;
    });

    it('with the value the job resolved with', async () => {
      const q = new Qyu({});
      const value = await q.add(() => mockAsyncFn('THE_VALUE'));
      expect(value).to.equal('THE_VALUE');
    });

    it('or with the value the job rejected with', async () => {
      const q = new Qyu({});
      const promise = q.add(async () => {
        throw await mockAsyncFn('THE_VALUE');
      });
      await expect(promise).to.eventually.be.rejected.and.equal('THE_VALUE');
    });
  });
});

describe('`map` method', () => {
  it("invokes the function in the second argument for each item in the first argument array with two arguments in itself: the item and it's index", () => {
    const q = new Qyu({ concurrency: 3 });
    const items = ['A', 'B', 'C'];
    const fn = sinon.spy();
    q.map(items, fn);
    expect(fn.args).to.deep.equal([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);
  });
});

describe('`whenEmpty` method', () => {
  it('should return a promise', () => {
    const q = new Qyu({});
    expect(q.whenEmpty()).to.be.instanceOf(Promise);
  });

  it('that resolves once a Qyu instance has no running or queued jobs, regardless if some jobs ended up fulfilled or rejected', async () => {
    const q = new Qyu({ concurrency: 2 });
    let finishedCount = 0;

    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
    });
    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
      throw new Error();
    });
    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
    });

    await q.whenEmpty();

    expect(finishedCount).to.equal(3);
  });
});

describe('`empty` method', () => {
  it('should reject all queued jobs with a QyuError of code "ERR_JOB_DEQUEUED" and not call them', async () => {
    const q = new Qyu({ concurrency: 1 });
    const fn = sinon.spy(mockAsyncFn);

    const [, prom1, prom2] = [q.add(fn), q.add(fn), q.add(fn)];

    q.empty();

    await expect(prom1)
      .to.be.eventually.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_DEQUEUED' });

    await expect(prom2)
      .to.be.eventually.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_DEQUEUED' });

    expect(fn.calledOnce).to.be.true;
  });

  it('should return a promise that resolves once all active jobs at the time of calling are done', async () => {
    const q = new Qyu({ concurrency: 2 });
    let jobsDoneCount = 0;
    const job = async () => {
      await mockAsyncFn();
      jobsDoneCount++;
    };
    q.add(job);
    q.add(job);
    q.add(job);
    await q.empty();
    expect(jobsDoneCount).to.equal(2);
  });
});

describe('`whenFree` method', () => {
  it('should return a promise', () => {
    const q = new Qyu({});
    expect(q.whenFree()).to.be.instanceOf(Promise);
  });

  it('that resolves once number of currently running jobs get below the concurrency limit', async () => {
    let startedCount = 0;
    let finishedCount = 0;
    const q = new Qyu({ concurrency: 2 });
    const job = async () => {
      startedCount++;
      await mockAsyncFn();
      finishedCount++;
    };
    for (let i = 0; i < 3; ++i) {
      q.add(job);
    }
    await q.whenFree();
    expect(startedCount).to.equal(3);
    expect(finishedCount).to.equal(2);
  });
});

describe('The `timeout` option, when adding a task', () => {
  it('should cancel a queued job if waits in queue more than the specified time', async () => {
    const q = new Qyu({ concurrency: 1 });
    const fn = sinon.spy();
    const promise = q.add(() => mockAsyncFn(undefined, 100));
    q.add(fn, { timeout: 50 });
    await promise;
    expect(fn.notCalled).to.be.true;
  });

  it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
    const q = new Qyu({ concurrency: 1 });

    const promise = q.add(() => mockAsyncFn(undefined, 100));
    const promiseWithTimeout = q.add(() => mockAsyncFn(undefined, 0), {
      timeout: 50,
    });

    await expect(promise).to.eventually.be.fulfilled;
    await expect(promiseWithTimeout)
      .to.eventually.be.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_TIMEOUT' });
  });
});

describe('The `priority` option, when adding a task', () => {
  it('will default to 0', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('a'), { priority: -1 }),
      q.add(() => actualOrder.push('b'), { priority: 1 }),
      q.add(() => actualOrder.push('c'), {}),
    ]);
    expect(actualOrder).to.deep.equal(['b', 'c', 'a']);
  });

  it('will queue jobs with the same priority by the order they were added', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('a'), { priority: 0 }),
      q.add(() => actualOrder.push('b'), { priority: 0 }),
      q.add(() => actualOrder.push('c'), { priority: 0 }),
      q.add(() => actualOrder.push('d'), { priority: 0 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });

  it('if currently running jobs are at the concurrency limit, queue a job AFTER jobs with more or equal priority, and BEFORE other jobs that have less priority if any', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('b'), { priority: 2 }),
      q.add(() => actualOrder.push('a'), { priority: 3 }),
      q.add(() => actualOrder.push('d'), { priority: 1 }),
      q.add(() => actualOrder.push('c'), { priority: 2 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });
});
