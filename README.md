# Qyu
`qyu` is a general-purpose asynchronous job queue for the browser and Node.js. It is flexible and easy to use, always accepting jobs and running them as fast as the concurrency settings dictate.

Qyu was meant for:
- large-scale web scrapers
- throttling external API calls
- restraining database bandwidth usage in long-running database background operations
- a lot more...

```js
const { Qyu } = require('qyu');

async function performRequest(){ // Note that async functions always return a promise. Same could be accomplished with any "normal" function that returns a promise
    const { data } = await axios('https://www.example.com');
    //....
}

(async () => {
    const q = new Qyu({ concurrency: 3 });

    // Basic:
    q(performRequest); // q expects a function that returns a promise

    // Extra options:
    q({
        fn: performRequest,
        priority: 2,
    });

    // Returns a promise (that resolves or rejects when the job is eventually picked from queue
    // and run with the same value it resolved or rejected with):
    const result = await q(performRequest);

    // No matter if more jobs come around later!
    // Qyu will queue them as expected and optimally manage them all for you
    // based on your concurrency setting
    setTimeout(() => {
        for (let i = 0; i < 10; i++) {
            q(performRequest);
        }
    }, 2000);

    await q.whenEmpty(); // When all tasks finished and queue is empty...
})();
```

# Features

- Always on and ready to receive additional tasks
- Configurable concurrency limit
- Configurable queue capacity limit
- Configurable priority per individual tasks
- Configurable queue timeout duration per individual tasks
- Pause/resume queue execution
- Compatible for browsers as well as Node.js environments
- Written in TypeScript, full type definitions built-in
- Provides both CJS and ESM builds

# Instance Config

Defaults:
```js
new Qyu({
    concurrency: 1,
    capacity: Infinity,
    rampUpTime: 0
});
```
#### `concurrency`:
Determines the maximum number of jobs allowed to be executed concurrently.
*(default: `1`)*
```js
const q = new Qyu({ concurrency: 2 }); // Max 2 jobs can run concurrently
q(job1); // Runs immediately
q(job2); // Also runs immediately
q(job3); // will be queued up until either job1 or job2 is complete to maintain no more than 2 jobs at a time
```
#### `capacity`:
Sets a limit on the job queue length, causing any additional job queuings to be immediately rejected with an instance of `QyuError` with a `code` property holding `"ERR_CAPACITY_FULL"`.
*(default: `Infinity`)*
```js
const q = new Qyu({ capacity: 5 });
// Queuing a batch of 6 jobs; since the 6th one exceeds the max capcacity, the promise it's about to return is going to be rejected immediately
for (let i = 0; i < 6; i++) {
    q(job)
    .then(result => console.log(`Job ${i} complete!`, result))
    .catch(err => console.error(`job ${i} error`, err)); // err is a `QyuError` with `code: "ERR_CAPACITY_FULL"`
}
```
#### rampUpTime:
If specified a non-zero number, will delay the concurrency-ramping-up time of additional job executions, one by one, as the instance attempts to reach maximum configured concurrency.
Represents number of milliseconds.
*(default: `0`)*
```javascript
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

#### `priority`:
Determines order in which queued jobs will be picked up for execution.
Can be any positive/negative integer/float number.
The greater the priority value, the earlier the job will be called in relation to other queued jobs.
Queued jobs having the same priority (or similarly having no explicit `priority` provided) will get scheduled relative to one another by the very order in which they were passed on to the Qyu instance.
*(default: `0`)*

Example:
```js
const q = new Qyu();

const fn1 = async () => {/* ... */};
const fn2 = async () => {/* ... */};

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
```js
const q = new Qyu({ concurrency: 1 });

q(async () => {/* ... */});

q({
    fn: async () => {/* ... */}, // Awaits in queue for the previously queued job above to finish (due to `concurrency` of 1)
    timeout: 3000
});

// If 3 seconds are due and by this time the first job is still not done (-> its promise is yet to be resolved), the second job would be dequeued and prevented from running.
```

# API

### instance(`jobs`)
*(alias: instance#add)*

Queues up the given `jobs`, which can be either a single "job", or an array of such for batch queuing.

Every job (whether given as singular or as an array) can either be a plain function or a "job object" with the following properties:
- `fn`: function
- `timeout`: number _(optional)_ - [details on timeout here](#timeout)
- `priority`: number _(optional)_ - [details on priority here](#priority)

**Returns**:

If given a __singular__ non-array input - returns a promise that fulfills with the resolution or rejection value the job will produce when it eventually gets picked up from the queue and executed. Example:

```javascript
const q = new Qyu();

const myTaskFn = async () => {/* ... */};

const result = await q(myTaskFn);

// or with extra options:

const result = await q({
    fn: myTaskFn1,
    priority: 1,
    timeout: 3000,
});
```

If given an __array__ input - returns a promise that resolves when each of the given jobs were resolved, with the value of an array containing each job's resolution value, ordered as were the jobs when originally given, or rejects as soon as any of the given jobs happens to reject, reflecting that job's rejection value (_very similarly_ to the native [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all#return_value) behavior). Example:

```javascript
const q = new Qyu();

const myTaskFn1 = async () => {/* ... */};
const myTaskFn2 = async () => {/* ... */};

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
    },
]);
```

### instance#whenEmpty()
**Returns**: a promise that resolves if/when an instance has no running or queued jobs.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenEmpty();
```

### instance#whenFree()
**Returns**: a promise that resolves if/when number of currently running jobs are below the concurrency limit.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenFree();
```

### instance#pause()
Pauses instance's operation, so it effectively stops picking more jobs from queue.
Jobs currently running at time `instance.pause()` was called keep running until finished.
```javascript
const q = new Qyu({concurrency: 2});
q(job1); q(job2); q(job3);
// Pausing; job3 will be held in queue until q.resume() is engaged.
// job1 and job2 are already running regardless - since we've set the concurrency to `2` they were allowed to be immediately away without having to be queued
await q.pause();
q(job4); // job4 will also be added to the queue, not to be called until resuming...
```

### instance#resume()
Resumes instance's operation after a previous call to `instance.pause()`.
An instance is in "resumed" mode by default when instantiated.
```javascript
const q = new Qyu();
q.pause();
// Queue some jobs here...
q.resume();
// Only now the instance will start executing the jobs that have been added above!
```

### instance#empty()
Immediately empties the instance's queue from all queued jobs, rejecting the promises returned from their queuings with a `"ERR_JOB_DEQUEUED"` type of `QyuError`.
Jobs currently running at the time `instance.empty()` was called keep running until finished.
```javascript
const q = new Qyu({concurrency: 1});
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
```javascript
const q = new Qyu({concurrency: 1, capacity: 3});
q(job1); q(job2); q(job3);
// Up until now, only job 1 was actually called due to the `concurrency` of 1.
q.set({concurrency: 2, capacity: 2});
// At this point, job2 will be called as well due to `concurrency` being increased to 2, but also having the `capacity` decreased by 1 causes job3 to immediately dequeue and reject in order to not exceed the updated capacity.
```



# Examples

Throttled, concurrent file deletion:
```js
const fs = require('fs/promises');
const { Qyu } = require('qyu');

const q = new Qyu({ concurrency: 3 }); // -> So we can only process up to 3 deletions at the same time!

const filesToDelete = [
    '/path/to/file1.png',
    '/path/to/file2.png',
    '/path/to/file3.png'
    '/path/to/file4.png'
    // ...
];

const deletionJobs = filesToDelete.map(path => () => fs.unlink(path));

await q(deletionJobs);
```

Web Scraper:
```js
const { Qyu } = require('qyu');
const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    const siteUrl = 'http://www.store-to-crawl.com/products';
    const q = new Qyu({ concurrency: 3 });

    for (let i = 1; i <= 10; i++) {
        q(async () => {
            const resp = await axios(`${siteUrl}?page=${i}`);
            const $ = cheerio.load(resp.data);
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
})();
```
