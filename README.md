# Qyu
`qyu` is a general-purpose asynchronous job queue for Node.js. It is flexible and easy to use, always accepting jobs and running them as fast as the concurrency settings dictate.

Qyu was meant for:
- large-scale web scrapers
- throttling external API calls
- restraining database bandwidth usage in long-running database background operations
- a lot more...

```javascript
const Qyu = require('qyu');

(async () => {
    const q = new Qyu({concurrency: 3});

    // Basic:
    q(myAsyncFunction);

    // Extra options:
    q(myAsyncFunction, {priority: 2}, arg1, arg2 /*, ...*/));

    // Returns promise (resolving or rejecting when job is eventually picked from queue
    // and run with the same value it resolved or rejected with):
    let result = await q(myAsyncFunction);

    // Doesn't matter if more jobs come around later,
    // Qyu will queue them as necessary and optimally manage them all
    // for you based on your concurrency setting
    setTimeout(() => {
      for (let i=0; i<10; i++) {
          q(myAsyncFunction);
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
- Supports streaming (in object mode) for memory-efficient data processing

# API

##### instance(`fn`[, `options`[, `...args`]])
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

##### instance(`iterator`, `mapperFn`[, `options`])
*(alias: instance#map)*
For each iteration of `iterator`, queues `mapperFn` on instance, injected with the value and the index from that iteration.
Optional `options` will be supplied the same for all job queuings included in this call.
```javascript
const q = new Qyu({concurrency: 3});
const files = ['/path/to/file1.png', '/path/to/file2.png', '/path/to/file3.png', '/path/to/file4.png'];
// Throttled, concurrent file deletion:
q(files, async (file, i) => {
    await fs.unlink(file); // `unlink` function from require('fs').promises...
});
```

##### instance#whenEmpty()
**Returns**: a promise that resolves if/when an instance has no running or queued jobs.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenEmpty();
```

##### instance#whenFree()
**Returns**: a promise that resolves if/when number of currently running jobs are below the concurrency limit.
Guaranteed to resolve, regardless if one or some jobs resulted in error.
```javascript
const q = new Qyu();
/* Some jobs get queued here... */
await q.whenFree();
```

##### instance#pause()
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

##### instance#resume()
Resumes instance's operation after a previous call to `instance.pause()`.
An instance is in "resumed" mode by default when instantiated.
```javascript
const q = new Qyu();
q.pause();
// Queue some jobs here...
q.resume();
// Now instance will run the job queue again normally!
```

##### instance#empty()
Immediately empties the instance's entire queue from all queued jobs.
Jobs currently running at the time `instance.empty()` was called keep running until finished.
```javascript
const q = new Qyu({concurrency: 1});
q(job1); q(job2);
q.empty(); // Because the concurrency was set to "1", job1 is already running in this point, but job2 will be dequeued and never run.
```

# Examples

Web Scraper:
```javascript
const
    Qyu = require('qyu'),
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
