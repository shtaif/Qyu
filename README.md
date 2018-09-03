# Qyu


### Usage:

```javascript
const Qyu = require('qyu');

(async () => {
    const q = new Qyu({concurrency: 3});

    // Basic:
    q.add(myAsyncFunction);

    // Extra options:
    q.add(myAsyncFunction, {priority: 7}, arg1, arg2 /*, ...*/));

    // Doesn't matter if more jobs come around later,
    // Qyu will queue them as necessary and optimally manage them all
    // for you based on your concurrency setting
    setTimeout(() => {
      for (let i=0; i<10; i++) {
          q.add(myAsyncFunction);
      }
    }, 2000);

    await q.whenEmpty(); // When all tasks finished and queue is empty...
})();

```


`qyu` is a general-purpose asynchronous job queue for Node.js. It's flexible and easy to use, and always accepting jobs and running them as fast as the concurrency settings dictates.

Qyu was meant for:
- large-scale web scrapers
- throttling external API calls
- restraining database bandwidth usage in long-running database background operations
- a lot more...

# Features

- Always on and ready to receive additional tasks
- Concurrency setting
- Queue capacity
- Task priority
- Task timeout
- Pause/resume
- Supports streaming (in object mode) for memory-efficient data processing

# API
...

# Scraper Example:

```javascript
const
    Qyu = require('qyu'),
    axios = require('axios'),
    cheerio = require('cheerio');

(async () => {
    let siteUrl = 'http://www.store-to-crawl.com/products';
    let q = new Qyu({concurrency: 3});

    for (let i=1; i<=10; i++) {
        q.add(async () => {
            let { data: html } = await axios(siteUrl+'?page='+i);
            let $ = cheerio.load(html);
            let products = []
            $('.prod-list .product').each((i, elem) => {
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
