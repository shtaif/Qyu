const { Qyu, QyuError } = require('./.');

const delay = async (time = 1000) => {
  await new Promise(resolve => setTimeout(resolve, time));
};

const mockAsync = async (result = true, time = 25) => {
  await delay(time);
  return result;
};

const noop = val => val;

const getPromiseStatus = async input => {
  let wasInputArray = input instanceof Array;

  if (!wasInputArray) {
    input = [input];
  }

  let statuses = [...input].fill('pending');

  input.forEach(async (promise, i) => {
    try {
      await promise;
      statuses[i] = 'resolved';
    } catch (err) {
      statuses[i] = 'rejected';
    }
  });

  await delay(0);

  return wasInputArray ? statuses : statuses[0];
};

describe('When A Qyu instance is invoked as a function', () => {
  it('with a function as the first arg - should internally call the `add` method with the job and options and injecting any addiontional args passed into it', () => {
    const q = new Qyu();
    const jobOpts = {};
    const spy = jest.spyOn(q, 'add');
    q(noop, jobOpts, 'a', 'b', 'c', 'd');
    expect(spy).toHaveBeenCalledWith(noop, jobOpts, 'a', 'b', 'c', 'd');
  });

  it('with an array as the first arg - should internally call the `map` method with the array, function and options args passed into it', () => {
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
    let q = new Qyu({ concurrency: 2 });

    let job1 = jest.fn(mockAsync);
    let job2 = jest.fn(mockAsync);

    q.add(job1);
    q.add(job2);

    expect(job1).toHaveBeenCalled();
    expect(job2).toHaveBeenCalled();
  });

  it('will not call added functions immediately if currently running jobs are at the concurrency limit', () => {
    let q = new Qyu({ concurrency: 1 });
    let job = jest.fn();

    q.add(mockAsync);
    q.add(job);

    expect(job).not.toHaveBeenCalled();
  });

  it('will not call added functions if they exceed the capacity limit', () => {
    let q = new Qyu({ concurrency: 1, capacity: 1 });
    let job1 = jest.fn(mockAsync);
    let job2 = jest.fn(mockAsync);

    q.add(job1);
    q.add(job2);

    expect(job1).toHaveBeenCalled();
    expect(job2).not.toHaveBeenCalled();
  });

  it('will inject every 3rd and up additional arguments supplied to it to the job function itself', () => {
    let q = new Qyu();
    let job = jest.fn();
    q.add(job, {}, 'a', 'b', 'c', 'd');
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
      })(),
    ]);
  });

  describe('should return a', () => {
    it('promise', () => {
      let q = new Qyu({});
      let promise = q.add(() => mockAsync());
      expect(promise instanceof Promise).toBe(true);
    });

    it('rejects immediately with a QyuError of code "ERR_CAPACITY_FULL" if instance capacity is full', async () => {
      let q = new Qyu({ capacity: 1 });

      q.add(mockAsync);
      q.add(mockAsync); // this queuing and the one above it fill the queue length up to 1 (the earlier was called immediately, and the current is then put in queue)
      let promise = q.add(() => {}); // this is expected to reject since the current length of queue should be 1 at that point, which equals to the max capacity of 1

      expect(await getPromiseStatus(promise)).toBe('rejected');

      try {
        await promise;
      } catch (err) {
        expect(err instanceof QyuError).toBe(true);
        expect(err.code).toBe('ERR_CAPACITY_FULL');
      }
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
          throw new Error();
        });
      } catch (err) {
        expect(done).toBe(true);
      }
    });

    it('with the value the job resolved with', async () => {
      let q = new Qyu({});
      let value = await q.add(() => mockAsync('THE_VALUE'));
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
    let q = new Qyu({ concurrency: 3 });
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

    for (let i = 0; i < numToRun; ++i) {
      q.add(async () => {
        startedCount++;
        await mockAsync();
        finishedCount++;
        if (i % 2 === 1) {
          // If `i` is odd
          throw new Error('some_simulated_failure_error');
        }
      });
    }

    await q.whenEmpty();

    expect(startedCount).toBe(numToRun);
    expect(finishedCount).toBe(numToRun);
  });
});

describe('`empty` method', () => {
  it('should reject all queued jobs with a QyuError of code "ERR_JOB_DEQUEUED" and not call them', async () => {
    let q = new Qyu({ concurrency: 1 });
    let fn = jest.fn(mockAsync);

    q.add(mockAsync);
    let p1 = q.add(fn);
    let p2 = q.add(fn);

    q.empty();

    expect(await getPromiseStatus([p1, p2])).toMatchObject([
      'rejected',
      'rejected',
    ]);

    try {
      await p1;
    } catch (err) {
      expect(err instanceof QyuError).toBe(true);
      expect(err.code).toBe('ERR_JOB_DEQUEUED');
    }

    try {
      await p2;
    } catch (err) {
      expect(err instanceof QyuError).toBe(true);
      expect(err.code).toBe('ERR_JOB_DEQUEUED');
    }

    expect(fn).not.toHaveBeenCalled();
  });

  it('should return a promise that resolves once all active jobs at the time of calling are done', async () => {
    let q = new Qyu({ concurrency: 2 });

    let p1 = new Promise(resolve => {
      q.add(async () => {
        await mockAsync();
        resolve();
      });
    });
    let p2 = new Promise(resolve => {
      q.add(async () => {
        await mockAsync();
        resolve();
      });
    });
    let p3 = new Promise(resolve => {
      q.add(async () => {
        await mockAsync();
        resolve();
      });
    });

    await q.empty();

    expect(await getPromiseStatus([p1, p2])).toMatchObject([
      'resolved',
      'resolved',
    ]);
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

    for (let i = 0; i < numToRun; ++i) {
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
        await mockAsync(true, 100);
        resolve();
      });
    });

    q.add(fn, { timeout: 50 });

    await promise;
    await delay(0);

    expect(fn).not.toHaveBeenCalled();
  });

  it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
    let q = new Qyu({ concurrency: 1 });

    q.add(() => mockAsync(true, 100));

    try {
      await q.add(() => {}, { timeout: 50 });
    } catch (err) {
      expect(err instanceof QyuError).toBe(true);
      expect(err.code).toBe('ERR_JOB_TIMEOUT');
      return;
    }

    throw new Error(
      'Expected job to reject (due to timeout), instead it resolved'
    );
  });
});

describe('The `priority` option, when adding a task', () => {
  it('will default to 0', async () => {
    let q = new Qyu({ concurrency: 1 });
    let actualOrder = [];
    let push = value => actualOrder.push(value);

    q.add(mockAsync); // To raise activity to max concurrency...

    await Promise.all([
      new Promise(resolve =>
        q.add(
          () => {
            push('a');
            resolve();
          },
          { priority: -1 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('b');
            resolve();
          },
          { priority: 1 }
        )
      ),
      new Promise(resolve =>
        q.add(() => {
          push('c');
          resolve();
        }, {})
      ),
    ]);

    expect(actualOrder).toMatchObject(['b', 'c', 'a']);
  });

  it('will queue jobs with the same priority by the order they were added', async () => {
    let q = new Qyu({ concurrency: 1 });
    let actualOrder = [];
    let push = value => actualOrder.push(value);

    q.add(mockAsync); // To raise activity to max concurrency...

    await Promise.all([
      new Promise(resolve =>
        q.add(
          () => {
            push('a');
            resolve();
          },
          { priority: 0 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('b');
            resolve();
          },
          { priority: 0 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('c');
            resolve();
          },
          { priority: 0 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('d');
            resolve();
          },
          { priority: 0 }
        )
      ),
    ]);

    expect(actualOrder).toMatchObject(['a', 'b', 'c', 'd']);
  });

  it('if currently running jobs are at the concurrency limit, queue a job AFTER jobs with more or equal priority, and BEFORE other jobs that have less priority if any', async () => {
    let q = new Qyu({ concurrency: 1 });
    let actualOrder = [];
    let push = value => actualOrder.push(value);

    q.add(mockAsync); // To raise activity to max concurrency...

    await Promise.all([
      new Promise(resolve =>
        q.add(
          () => {
            push('b');
            resolve();
          },
          { priority: 2 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('a');
            resolve();
          },
          { priority: 3 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('d');
            resolve();
          },
          { priority: 1 }
        )
      ),
      new Promise(resolve =>
        q.add(
          () => {
            push('c');
            resolve();
          },
          { priority: 2 }
        )
      ),
    ]);

    expect(actualOrder).toMatchObject(['a', 'b', 'c', 'd']);
  });
});
