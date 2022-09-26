# Qyu
`qyu` is a general-purpose asynchronous job queue for Node.js. It is flexible and easy to use, always accepting jobs and running them as fast as the concurrency settings dictate.

Qyu was meant for:
- large-scale web scrapers
- throttling external API calls
- restraining database bandwidth usage in long-running database background operations
- a lot more...

```js
const { Qyu } = require('qyu');

(async () => {
    const q = new Qyu({concurrency: 3});

    async function performRequest(){ // Note that async functions always return a promise. Same could be accomplished with any "normal" function that returns a promise
        const {data} = await axios('https://www.example.com');
        //....
    }

    // Basic:
    q(performRequest); // q expects a function that returns a promise

    // Extra options:
    q(performRequest, {priority: 2}, arg1, arg2 /*, ...*/);

    // Returns promise (resolving or rejecting when job is eventually picked from queue
    // and run with the same value it resolved or rejected with):
    let result = await q(performRequest);

    // No matter if more jobs come around later!
    // Qyu will queue them as necessary and optimally manage them all
    // for you based on your concurrency setting
    setTimeout(() => {
        for (let i=0; i<10; i++) {
            q(performRequest);
        }
    }, 2000);

    await q.whenEmpty(); // When all tasks finished and queue is empty...
})();
```


# Features

- Always on and ready to receive additional tasks
- Concurrency setting
- Queue capacity
- Task priority
- Task timeout
- Pause/resume


# Instance Config

Defaults:
```javascript
new Qyu({
    concurrency: 1,
    capacity: Infinity,
    rampUpTime: 0
});
```
#### concurrency:
Determines the maximum number of jobs allowed to be run concurrently.
*(default: 1)*
```javascript
const q = new Qyu({concurrency: 2}); // Max 2 jobs can run concurrently
q(job1); // Runs immediately
q(job2); // Also runs immediately
q(job3); // will be queued up until either job1 or job2 is complete to maintain no more than 2 jobs at a time
```
#### capacity:
Sets a limit on the job queue length, causing any additional job queuings to be immediately rejected with a specific `"ERR_CAPACITY_FULL"` type of `QyuError`.
*(default: Infinity)*
```javascript
const q = new Qyu({capacity: 5});
// Queuing a batch of 6 jobs; since the 6th one crosses the max capcacity, it's returned promise is going to be immediately rejected
for (let i=0; i<6; i++) {
    q(job)
    .then(result => console.log(`Job ${i} complete!`, result))
    .catch(err => console.error(`job ${i} error`, err)); // err is a QyuError with code: "ERR_CAPACITY_FULL"
}
```
#### rampUpTime:
If specified a non-zero number, will delay the concurrency-ramping-up time of additional job executions, one by one, as the instance attempts to reach maximum configured concurrency.
Represents number of milliseconds.
*(default: 0)*
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

Defaults:
```javascript
q(job, {
    priority: 0,
    timeout: null
});
```
#### priority:
Determines order in which queued jobs will run.
Can be any positive/negative integer/float number.
The greater the priority value, the earlier it will be called relative to other jobs.
Queuings having identical priority will be put one after another in the same order in which they were passed to the instance.
*(default: 0)*

#### timeout:
If is non-zero number, will dequeue jobs that waited in queue without running for that amount of time long (in milliseconds).
additionally, when a queued job reaches it's timeout, the promise it returned from it's queuing will reject with a `"ERR_JOB_TIMEOUT"` type of `QyuError`.
*(default: null)*


# API

#### instance(`fn`[, `options`[, `...args`]])
*(alias: instance#add)*
Queues function `fn` on instance with optional `options` and `args`.
`args` will all be injected as arguments to `fn` once called.
**Returns**: *a promise that is tied to the jobs resolution or rejection value when it will be picked from queue and run.*
```javascript
const q = new Qyu({concurrency: 5});

// Default options:
q(job1);

// Custom options:
q(job2, {priority: 2, timeout: 1000*10});

// Awaiting on the queuing-returned promise, catching potential rejections:
// (job1 and job2 keep running in the background without interruption)
try {
    const result = await q(job3);
    console.log("Job 3's result:", result);
} catch (err) {
    console.log('Job 3 errored:', err);
}

// This will be queued (or called right away if concurrency allows) only after job3 completed, regardless of job1 or job2's state! (Note the skipping of the second options argument in order to specify custom job arguments)
q((arg1, arg2) => {
    // Do something with arg1, arg2...
}, null, arg1, arg2 /*, ...*/);
```

#### instance(`iterator`, `mapperFn`[, `options`])
*(alias: instance#map)*
For each iteration of `iterator`(an array for example), queues `mapperFn` on instance, injected with the value and the index from that iteration.
Optional `options` will be supplied the same for all job queuings included in this call.
```javascript
const q = new Qyu({concurrency: 3});
const files = ['/path/to/file1.png', '/path/to/file2.png', '/path/to/file3.png', '/path/to/file4.png'];
// Throttled, concurrent file deletion:
q(files, async (file, i) => {
    await fs.unlink(file); // `unlink` function from require('fs').promises...
});

await q.whenEmpty()//Will be resolved when no queued jobs are left.
```

#### instance#whenEmpty()
**Returns**: a promise that resolves if/when an instance has no running or queued jobs.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenEmpty();
```

#### instance#whenFree()
**Returns**: a promise that resolves if/when number of currently running jobs are below the concurrency limit.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenFree();
```

#### instance#pause()
Pauses instance's operation, so it effectively stops picking more jobs from queue.
Jobs currently running at time `instance.pause()` was called keep running until finished.
```javascript
const q = new Qyu({concurrency: 2});
q(job1); q(job2); q(job3);
// Pausing; job3 will be held in queue until q.resume() is engaged.
// job1 and job2 are already running regardless, because setting the concurrency to "2" allowed them to be called right away without queueing
await q.pause();
q(job4); // job4 will also be added to the queue, not to be called until resuming...
```

#### instance#resume()
Resumes instance's operation after a previous call to `instance.pause()`.
An instance is in "resumed" mode by default when instantiated.
```javascript
const q = new Qyu();
q.pause();
// Queue some jobs here...
q.resume();
// Now instance will run the job queue again normally!
```

#### instance#empty()
Immediately empties the instance's queue from all queued jobs, rejecting the promises returned from their queuings with a `"ERR_JOB_DEQUEUED"` type of `QyuError`.
Jobs currently running at the time `instance.empty()` was called keep running until finished.
```javascript
const q = new Qyu({concurrency: 1});
q(job1); q(job2);
await q.empty(); // Because the concurrency was set to "1", job1 is already running in this point, but job2 will be dequeued and never run.
// The above "await" will resolve once job1 finally finishes...
```

#### instance#set(`config`)
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

Web Scraper:
```js
const
    { Qyu } = require('qyu'),
    axios = require('axios'),
    cheerio = require('cheerio');

(async () => {
    const siteUrl = 'http://www.store-to-crawl.com/products';
    const q = new Qyu({concurrency: 3});

    for (let i=1; i<=10; i++) {
        q(async () => {
            let resp = await axios(siteUrl+'?page='+i);
            let $ = cheerio.load(resp.data);
            let products = [];
            $('.product-list .product').each((i, elem) => {
                let $elem = $(elem);
                let title = $elem.find('.title').text();
                let price = $elem.find('.price').text();
                products.push({ title, price });
            });
            // Do something with products...
        });
    }

    await q.whenEmpty();

    // All done!
})();
```
