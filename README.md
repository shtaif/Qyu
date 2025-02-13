# Qyu

<p>

  [![npm published version](https://img.shields.io/npm/v/qyu?logo=npm&color=cb3837
  )](https://www.npmjs.com/package/qyu)
  [![Tests status](https://github.com/shtaif/qyu/actions/workflows/ci-run-tests.yaml/badge.svg)](https://github.com/shtaif/qyu/actions/workflows/ci-run-tests.yaml)
  [![Build status](https://github.com/shtaif/qyu/actions/workflows/ci-ts-build-check.yaml/badge.svg)](https://github.com/shtaif/qyu/actions/workflows/ci-ts-build-check.yaml)
  [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://semver.org)
  [![MIT License](https://img.shields.io/npm/l/qyu?color=3178c6&style=flat-square)](https://github.com/shtaif/qyu/blob/master/LICENSE.md)

</p>

`qyu` is a general-purpose asynchronous job queue for the browser and Node.js. It is flexible and easy to use, always accepting jobs and running them as fast as the concurrency settings dictate.

Qyu was meant for:
- large-scale web scrapers
- throttling external API calls
- restraining database bandwidth usage in long-running database background operations
- a lot more...

```ts
import { Qyu } from 'qyu';

async function fetchCat() {
  const res = await fetch('https://cataas.com/cat'); // fetches a random cat image...
  await res.blob();
  //....
}

const q = new Qyu({ concurrency: 3 });

// Basic:
q(fetchCat); // q expects a function that returns a promise

// Extra options:
q({
  fn: fetchCat,
  priority: 2,
  // ...
});

// Returns a promise (that resolves or rejects when the job is eventually picked from queue
// and run with the same value it resolved or rejected with):
const result = await q(fetchCat);

// It doesn't matter if more jobs come around later!
// Qyu will queue them as expected and optimally manage them all for you
// based on your concurrency setting
setTimeout(() => {
  for (let i = 0; i < 10; i++) {
    q(fetchCat);
  }
}, 2000);

await q.whenEmpty(); // When all tasks finished and queue is empty...
```

## ⭐️

If you find this package helpful, please consider giving it a star! ⭐️<br/>
Something is not right? don't hesitate to open an issue! 👍<br/>
Thank you a lot 🙏🏻

# Features

  - ✔️ Always on and ready to receive additional tasks
  - ✔️ Configurable concurrency limit
  - ✔️ Configurable queue capacity limit
  - ✔️ Configurable priority per individual tasks
  - ✔️ Configurable queue timeout duration per individual tasks
  - ✔️ Pause/resume queue execution
  - ✔️ Compatible for browsers as well as Node.js environments
  - ✔️ Written in TypeScript, full type definitions built-in
  - ✔️ Provides both CJS and ESM builds



# Table of Contents

  - [Instance Config](#instance-config)
    - [`concurrency`](#concurrency)
    - [`capacity`](#capacity)
    - [`rampUpTime`](#rampuptime)
  - [Queuing options](#queuing-option)
    - [`priority`](#priority)
    - [`timeout`](#timeout)
    - [`signal`](#signal)
  - [API](#api)
    - [instance(`jobs`)](#instancejobs)
    - [instance#whenEmpty()](#instancewhenempty)
    - [instance#whenFree()](#instancewhenfree)
    - [instance#pause()](#instancepause)
    - [instance#resume()](#instanceresume)
    - [instance#empty()](#instanceempty)
    - [instance#set(`config`)](#instancesetconfig)
  - [Examples](#examples)



# Instance Config

Defaults:

```ts
new Qyu({
  concurrency: 1,
  capacity: Infinity,
  rampUpTime: 0
});
```

#### `concurrency`:

Determines the maximum number of jobs allowed to be executed concurrently.
*(default: `1`)*

```ts
const q = new Qyu({ concurrency: 2 }); // Max 2 jobs can run concurrently
q(job1); // Runs immediately
q(job2); // Also runs immediately
q(job3); // will be queued up until either job1 or job2 is complete to maintain no more than 2 jobs at a time
```

#### `capacity`:

Sets a limit on the job queue length, causing any additional job queuings to be immediately rejected with an instance of `QyuError` with a `code` property holding `"ERR_CAPACITY_FULL"`.
*(default: `Infinity`)*

```ts
const q = new Qyu({ capacity: 5 });
// Queuing a batch of 6 jobs; since the 6th one exceeds the max capcacity, the promise it's about to return is going to be rejected immediately
for (let i = 0; i < 6; i++) {
  q(job)
  .then(result => console.log(`Job ${i} complete!`, result))
  .catch(err => console.error(`job ${i} error`, err)); // err is a `QyuError` with `code: "ERR_CAPACITY_FULL"`
}
```

#### `rampUpTime`:

If specified a non-zero number, will delay the concurrency-ramping-up time of additional job executions, one by one, as the instance attempts to reach maximum configured concurrency.
Represents number of milliseconds.
*(default: `0`)*

```ts
const q = new Qyu({
  rampUpTime: 1000,
  concurrency: 3
});
// Let's say each of these jobs is some long-running task:
q(job1);
q(job2);
q(job3);
q(job4);
// All 4 jobs are queued at the same time, but:
// job1 starts immediately, job2 will start after 1000ms, job3 will start after 2000ms, job4 crosses the max concurrency of 3, so will expectedly wait until either one of previous jobs is finished before it is started.
```

# Queuing options

Any of the following options may be provided when queueing individual jobs by invoking the Qyu instance (see the [`instance(jobs)` API](#instancejobs)).

#### `priority`:

Determines order in which queued jobs will be picked up for execution.
Can be any positive/negative integer/float number.
The greater the priority value, the earlier the job will be called in relation to other queued jobs.
Queued jobs having the same priority (or similarly having no explicit `priority` provided) will get scheduled relative to one another by the very order in which they were passed on to the Qyu instance.
*(default: `0`)*

Example:

```ts
const q = new Qyu();

const fn1 = async () => { /* ... */ };
const fn2 = async () => { /* ... */ };

q([
  { fn: fn1 },
  { fn: fn2, priority: 2 },
]);

// here `fn2` will be executed before `fn1` due to its higher priorty, even though `fn1` was was passed before it
```

#### `timeout`:

If is a non-zero positive number (representing milliseconds), the given job would be dequeued and prevented were it still be pending in queue at the time this duration expires.
Additionally, when a queued job reaches its timeout, the promise that was returned when it was initially queued would immediately become rejected with an instance of `QyuError` with a `code` property holding `"ERR_JOB_TIMEOUT"`.
*(default: `undefined`)*

Example:

```ts
const q = new Qyu({ concurrency: 1 });

q(async () => { /* ... */ });

q({
  fn: async () => { /* ... */ }, // Awaits in queue for the previously queued job above to finish (due to `concurrency` of 1)
  timeout: 3000
});

// If 3 seconds are due and by this time the first job is still not done (-> its promise is yet to be resolved), the second job would be dequeued and prevented from running.
```

#### `signal`:

An optional [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) for de-queing a pending job that hasn't started yet ([what if the job had already started?](#aborting-a-job-that-had-already-started)). When aborted by the user, the promise from the job's queueing will immediately reject with the abort [reason](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason) as an error value. *(default: `undefined`)*

```ts
const q = new Qyu({ concurrency: 1 });

const abortCtl = new AbortController();

q(async () => { /* ... */ });

const promise = q({
  fn: async () => { /* ... */ }, // Awaits in queue for the first job to finish (due to concurrency` of 1)
  signal: abortCtl.signal
});

// later...

abortCtl.abort(); // aborting the second job

await promise; // now `promise` will reject with the default "AbortError" error (or optionally a custom error if was provided in `abortCtl.abort(...)`)
```

You also can cancel multiple jobs simultaneously if you just pass them the same signal instance:

```ts
q({ fn: myJobFn, signal: abortCtl.signal });
q({ fn: myJobFn, signal: abortCtl.signal });

// or:

q([
  { fn: myJobFn, signal: abortCtl.signal },
  { fn: myJobFn, signal: abortCtl.signal }
]);

// and than...

abortCtl.abort(); // Aborts all the above jobs simultaneously
```

<span id="aborting-a-job-that-had-already-started">Aborting a job that had may or may not have already kicked off is up to you - you just need to set it up to support it.</span>

For example, if your job wraps a usage of an API that itself happens to support cancellation with `AbortSignal` as well, e.g [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) - then in such case you could simply pass the same `AbortSignal` you provide to Qyu while queueing the job ___also___ directly to that API inside the job function. Let's see this illustrated:

```ts
const q = new Qyu({ concurrency: myConcurrency });

const abortCtl = new AbortController();

q({
  fn: async () => {
    await fetch('https://...', { signal: abortCtl.signal });
    // ...
  },
  signal: abortCtl.signal
});

// later...

abortCtl.abort(); // Aborts the job, dequeuing it if still pending or canceling it mid-operation
```

In other cases, utilize `AbortSignal` being a generic API connecting it manually to any other available mechanism of stopping or cancelling your asynchronous job function _(refer to [`AbortSignal`'s API](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) or [`AbortController`'s API](oller) as needed)_.

```ts
const q = new Qyu({ concurrency: myConcurrency });

const abortCtl = new AbortController();

q({
  fn: async () => {
    abortCtl.signal.addEventListener('abort', () => {
      cancelDoingMyHomework();
    });
    await doMyHomework();
  },
  signal: abortCtl.signal
});

// later...

abortCtl.abort(); // Aborts the job, dequeuing it if still pending or canceling it mid-operation
```

# API

### instance(`jobs`)

*(alias: instance#add)*

Queues up the given `jobs`, which can be either a single "job", or an array of such to be queued in batch.

Every job (whether given singularly or in array) can be either a plain function or a "job object" with the following properties:
  - `fn`: function
  - `timeout`: number _(optional)_ - see [`timeout` on Queuing options](#timeout)
  - `priority`: number _(optional)_ - see [`priority` on Queuing options](#priority)
  - `signal`: AbortSignal _(optional)_ - see [`signal` on Queuing options](#signal)

**Returns**:

If given a __singular__ non-array input - returns a promise that fulfills with the resolution or rejection value the job will produce when it eventually gets picked up from the queue and executed. Example:

```ts
const q = new Qyu();

const myTaskFn = async () => { /* ... */ };

const result = await q(myTaskFn);

// or with extra options:

const result = await q({
  fn: myTaskFn1,
  priority: 1,
  timeout: 3000,
  signal: abortSignal,
});
```

If given an __array__ input - returns a promise that resolves when each of the given jobs were resolved, with the value of an array containing each job's resolution value, ordered as were the jobs when originally given, or rejects as soon as any of the given jobs happens to reject, reflecting that job's rejection value (_very similarly_ to the native [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all#return_value) behavior). Example:

```ts
const q = new Qyu();

const myTaskFn1 = async () => { /* ... */ };
const myTaskFn2 = async () => { /* ... */ };

const [result1, result2] = await q([myTaskFn1, myTaskFn2]);

// or with extra options:

const [result1, result2] = await q([
  {
    fn: myTaskFn1,
    priority: 1,
    timeout: 3000,
  },
  {
    fn: myTaskFn2,
    priority: 2,
    timeout: 3000,
    signal: abortSignal,
  },
]);
```

### instance#whenEmpty()

**Returns**: a promise that resolves if/when an instance has no running or queued jobs.
Guaranteed to resolve, regardless if one or some jobs resulted in error.

```ts
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenEmpty();
```

### instance#whenFree()

**Returns**: a promise that resolves if/when number of currently running jobs are below the concurrency limit.
Guaranteed to resolve, regardless if one or some jobs resulted in error.

```ts
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenFree();
```

### instance#pause()

Pauses instance's operation, so it effectively stops picking more jobs from queue.
Jobs currently running at time `instance.pause()` was called keep running until finished.

```ts
const q = new Qyu({ concurrency: 2 });
q(job1); q(job2); q(job3);
// Pausing; job3 will be held in queue until q.resume() is engaged.
// job1 and job2 are already running regardless - since we've set the concurrency to `2` they were allowed to be immediately away without having to be queued
await q.pause();
q(job4); // job4 will also be added to the queue, not to be called until resuming...
```

### instance#resume()

Resumes instance's operation after a previous call to `instance.pause()`.
An instance is in "resumed" mode by default when instantiated.
```ts
const q = new Qyu();
q.pause();
// Queue some jobs here...
q.resume();
// Only now the instance will start executing the jobs that have been added above!
```

### instance#empty()

Immediately empties the instance's queue from all queued jobs, rejecting the promises returned from their queuings with a `"ERR_JOB_DEQUEUED"` type of `QyuError`.
Jobs currently running at the time `instance.empty()` was called keep running until finished.

```ts
const q = new Qyu({ concurrency: 1 });
q(job1); q(job2);
await q.empty(); // Because the concurrency was set to "1", job1 is already running in this point, but job2 will be dequeued and never run.
// The above "await" will resolve once job1 finally finishes...
```

### instance#set(`config`)

Update a living instance's config options in real time (`concurrency`, `capacity` and `rampUpTime`).
Note these (expected) side effects:
- If new `concurrency` is specified and is greater than previous setting, new jobs will immediately be drawn and called from queue as much as the difference from previously set `concurrency` up to the number of jobs that were held in queue at the time.
- if new `concurrency` is specified and is lower then previous setting, will postpone calling additional jobs until enough active jobs finish and make the actual concurrency degrade to the new setting by itself.
- if new `capacity` is specified and is lower than previous setting, will reject the last jobs in queue with a `"ERR_CAPACITY_FULL"` type of `QyuError` as much as the difference from the previously set `capacity`.

```ts
const q = new Qyu({ concurrency: 1, capacity: 3 });
q(job1); q(job2); q(job3);
// Up until now, only job 1 was actually called due to the `concurrency` of 1.
q.set({ concurrency: 2, capacity: 2 });
// At this point, job2 will be called as well due to `concurrency` being increased to 2, but also having the `capacity` decreased by 1 causes job3 to immediately dequeue and reject in order to not exceed the updated capacity.
```



# Examples

Throttled, concurrent file deletion:

```ts
import fs from 'fs/promises';
import { Qyu } from 'qyu';

const q = new Qyu({ concurrency: 3 }); // -> So we can only process up to 3 deletions at the same time!

const filesToDelete = [
  '/path/to/file1.png',
  '/path/to/file2.png',
  '/path/to/file3.png'
  // ...
];

const deletionJobs = filesToDelete.map(path => () => fs.unlink(path));

await q(deletionJobs);
```

Web Scraper:

```ts
import { Qyu } from 'qyu';
import cheerio from 'cheerio';

const siteUrl = 'http://www.store-to-crawl.com/products';
const q = new Qyu({ concurrency: 3 });

for (let i = 1; i <= 10; i++) {
  q(async () => {
    const res = await fetch(`${siteUrl}?page=${i}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const products = [];
    $('.product-list .product').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('.title').text();
      const price = $elem.find('.price').text();
      products.push({ title, price });
    });
    // Do something with `products`...
  });
}

await q.whenEmpty();

// All done!
```



# License

Free and licensed under the [MIT License](https://github.com/shtaif/Qyu/blob/master/LICENSE.md) (c) 2021
