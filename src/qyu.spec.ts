import 'chai-as-promised';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { Qyu, QyuError } from '../spec/libraryEntrypoint.js';
import { mockAsyncFn, delay, noop } from '../spec/testUtils/index.js';

describe('When A Qyu instance is invoked as a function', () => {
  it('delegates over to the `add` internally with the same function form input it was called with', () => {
    const q = new Qyu();
    const addSpied = (q.add = sinon.spy()); // `sinon.spy(q, 'add')` doesn't work because `q` is a Proxy object
    q(noop);
    expect(addSpied.firstCall.args).to.have.length(1).and.to.deep.equal([noop]);
  });

  it('delegates over to the `add` internally with the same job object form input it was called with', () => {
    const q = new Qyu();
    const addSpied = (q.add = sinon.spy()); // `sinon.spy(q, 'add')` doesn't work because `q` is a Proxy object
    q({
      fn: noop,
      priority: 1,
      timeout: 100,
    });
    expect(addSpied.firstCall.args)
      .to.have.length(1)
      .and.to.deep.equal([
        {
          fn: noop,
          priority: 1,
          timeout: 100,
        },
      ]);
  });

  it('delegates over to the `add` internally with the same array of mixed function/object form input it was called with', async () => {
    const q = new Qyu();
    const addSpied = (q.add = sinon.spy()); // `sinon.spy(q, 'add')` doesn't work because `q` is a Proxy object
    const input = [() => 1, { fn: () => 1 }, { fn: () => 1, priority: 1, timeout: 100 }] as const;

    q(input);

    expect(addSpied.firstCall.args).to.have.length(1).and.to.deep.equal([input]);
  });
});

describe('`add` method', () => {
  it('should return a promise', () => {
    const q = new Qyu({});
    const returnedVal = q.add(mockAsyncFn);
    expect(returnedVal).to.be.instanceof(Promise);
  });

  it('will resolve only as soon as the actual job is resolved', async () => {
    const q = new Qyu({});
    let resolvedByNow = false;

    const promise = q.add(async () => {
      await mockAsyncFn();
      resolvedByNow = true;
    });

    expect(resolvedByNow).to.be.false;
    await promise;
    expect(resolvedByNow).to.be.true;
  });

  it('will resolve with the value the job resolved with', async () => {
    const q = new Qyu({});
    const value = await q.add(() => mockAsyncFn(0, 'MY_VALUE'));
    expect(value).to.equal('MY_VALUE');
  });

  it('will reject only as soon as the actual job is rejected', async () => {
    const q = new Qyu({});
    let rejectedByNow = false;

    const promise = q.add(async () => {
      await mockAsyncFn();
      rejectedByNow = true;
      throw new Error();
    });

    expect(rejectedByNow).to.be.false;
    await promise.catch(noop);
    expect(rejectedByNow).to.be.true;
  });

  it('will reject with the value the job rejected with', async () => {
    const q = new Qyu({});
    const simulatedError = new Error();
    const promise = q.add(async () => {
      throw simulatedError;
    });
    await expect(promise).to.eventually.be.rejectedWith(simulatedError);
  });

  it('will resolve to an array of the combined values when given an array of jobs', async () => {
    const q = new Qyu();
    const result = await q.add([
      () => mockAsyncFn(0, { a: 'aaa' }),
      () => mockAsyncFn(0, { b: 'bbb' }),
      { fn: () => mockAsyncFn(0, { c: 'ccc' }) },
    ]);
    expect(result).to.deep.equal([{ a: 'aaa' }, { b: 'bbb' }, { c: 'ccc' }]);
  });

  it('will reject as soon as the first job in a given array of jobs rejects and with the same rejection value', async () => {
    const q = new Qyu();

    let secondJobResolvedByNow = false;
    let thirdJobResolvedByNow = false;
    const simulatedError = new Error();

    const promise = q.add([
      async () => {
        throw simulatedError;
      },
      async () => {
        await mockAsyncFn();
        secondJobResolvedByNow = true;
      },
      async () => {
        await mockAsyncFn();
        thirdJobResolvedByNow = true;
      },
    ]);

    await expect(promise).to.be.eventually.rejectedWith(simulatedError);
    expect(secondJobResolvedByNow).to.be.false;
    expect(thirdJobResolvedByNow).to.be.false;
  });

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

  // TODO: This test sometimes seems to experience some timing glitches that make it flaky; refactor it to be more reliable
  it('will delay in starting the next job queued, regardless of concurrency setting, by the specified amount of time if `rampUpTime` is more than zero', async () => {
    const rampUpTime = 100;
    const q = new Qyu({
      concurrency: 3,
      rampUpTime,
    });
    const job1 = sinon.spy(() => mockAsyncFn(250));
    const job2 = sinon.spy(() => mockAsyncFn(250));
    const job3 = sinon.spy(() => mockAsyncFn(250));
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

  it('will reject immediately with a QyuError of code "ERR_CAPACITY_FULL" if instance capacity is full', async () => {
    const q = new Qyu({ capacity: 1 });

    q.add(mockAsyncFn);
    q.add(mockAsyncFn); // this queuing and the one above it fill the queue length up to 1 (the earlier was called immediately, and the current is then put in queue)
    const promise = q.add(mockAsyncFn); // this is expected to reject since the current length of queue should be 1 at that point, which equals to the max capacity of 1

    const err = await expect(promise).to.be.rejected;
    expect(err).to.be.instanceof(QyuError).and.contain({ code: 'ERR_CAPACITY_FULL' });
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

    const succeedingTaskFn = async () => {
      await mockAsyncFn();
      finishedCount++;
    };

    const rejectTaskFn = async () => {
      await mockAsyncFn();
      finishedCount++;
      throw new Error();
    };

    await q.whenEmpty();

    expect(finishedCount).to.equal(0);

    q.add(succeedingTaskFn);
    q.add(rejectTaskFn);
    q.add(succeedingTaskFn);

    await q.whenEmpty();

    expect(finishedCount).to.equal(3);

    q.add(succeedingTaskFn);
    q.add(rejectTaskFn);
    q.add(succeedingTaskFn);

    await q.whenEmpty();

    expect(finishedCount).to.equal(6);
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
    const promise = q.add(() => mockAsyncFn(100));
    q.add({ fn, timeout: 50 });
    await promise;
    expect(fn.notCalled).to.be.true;
  });

  it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
    const q = new Qyu({ concurrency: 1 });

    const promise = q.add(() => mockAsyncFn(100));
    const promiseWithTimeout = q.add({ fn: mockAsyncFn, timeout: 50 });

    await expect(promise).to.eventually.be.fulfilled;
    await expect(promiseWithTimeout)
      .to.eventually.be.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_TIMEOUT' });
  });
});

describe('The `signal` option, when adding a task', () => {
  it('when queued a job with a pre-aborted signal, should reject the job queueing promise with an "AbortError" DOMException and not call the job', async () => {
    const q = new Qyu({ concurrency: 1 });

    const fn = sinon.spy();
    const abortedSignal = AbortSignal.abort();

    const promise = q.add({ fn, signal: abortedSignal });

    await expect(promise)
      .to.eventually.be.rejected.and.be.instanceOf(DOMException)
      .and.contain({ name: 'AbortError' });
    expect(fn.notCalled).to.be.true;
  });

  it('when queued a job with a signal which aborts before the job gets to start, should reject the job queueing promise with an "AbortError" DOMException and not call the job', async () => {
    const q = new Qyu({ concurrency: 1 });

    const fn = sinon.spy();
    const abortCtl = new AbortController();

    const delayerPromise = q.add(mockAsyncFn);
    const promise = q.add({ fn, signal: abortCtl.signal });
    abortCtl.abort();

    await expect(promise)
      .to.eventually.be.rejected.and.be.instanceOf(DOMException)
      .and.contain({ name: 'AbortError' });
    await delayerPromise;
    expect(fn.notCalled).to.be.true;
  });

  it('when queued a job with a signal which aborts with a user-provided reason before the job gets to start, should reject the job queueing promise with the user-provided reason and not call the job', async () => {
    const q = new Qyu({ concurrency: 1 });

    const fn = sinon.spy();
    const abortCtl = new AbortController();
    const myCustomAbortReason = new Error('☢️ custom abort reason ☢️');

    const delayerPromise = q.add(mockAsyncFn);
    const promise = q.add({ fn, signal: abortCtl.signal });

    abortCtl.abort(myCustomAbortReason);

    await expect(promise).to.eventually.be.rejected.and.equal(myCustomAbortReason);
    await delayerPromise;
    expect(fn.notCalled).to.be.true;
  });
});

describe('The `priority` option, when adding a task', () => {
  it('will default to 0', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add({ fn: () => actualOrder.push('a'), priority: -1 }),
      q.add({ fn: () => actualOrder.push('b'), priority: 1 }),
      q.add({ fn: () => actualOrder.push('c') }),
    ]);
    expect(actualOrder).to.deep.equal(['b', 'c', 'a']);
  });

  it('will queue jobs with the same priority by the order they were added', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add({ fn: () => actualOrder.push('a'), priority: 0 }),
      q.add({ fn: () => actualOrder.push('b'), priority: 0 }),
      q.add({ fn: () => actualOrder.push('c'), priority: 0 }),
      q.add({ fn: () => actualOrder.push('d'), priority: 0 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });

  it('if currently running jobs are at the concurrency limit, queue a job AFTER jobs with more or equal priority, and BEFORE other jobs that have less priority if any', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add({ fn: () => actualOrder.push('b'), priority: 2 }),
      q.add({ fn: () => actualOrder.push('a'), priority: 3 }),
      q.add({ fn: () => actualOrder.push('d'), priority: 1 }),
      q.add({ fn: () => actualOrder.push('c'), priority: 2 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });
});
