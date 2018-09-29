const { Qyu, QyuError } = require('../index');


const delay = async (time=1000) => {
    await new Promise(resolve => setTimeout(resolve, time));
};

const mockAsync = async (result=true, time=25) => {
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


describe('The `pause`/`resume` methods', () => {
    it('`pause` method should return a promise that is immediately resolved if no active jobs were at the time of calling `pause`', async () => {
        let q = new Qyu;
        let promise = q.pause();
        expect(await getPromiseStatus(promise)).toBe('resolved');
    });

    it('`pause` method should return a promise that resolves when all active jobs are done', async () => {
        let q = new Qyu;
        let fn1 = jest.fn(mockAsync);
        let fn2 = jest.fn(mockAsync);

        let p1 = q.add(fn1);
        let p2 = q.add(fn2);

        await q.pause();

        expect(fn1).toHaveBeenCalled();
        expect(fn2).not.toHaveBeenCalled();
        expect(await getPromiseStatus([p1, p2])).toMatchObject(['resolved', 'pending']);
    });

    it('`whenEmpty` should return a pending promise if instance is paused when idle', async () => {
        let q = new Qyu;
        q.pause();
        expect(await getPromiseStatus(q.whenEmpty())).toBe('pending');
    });

    it('`whenEmpty` should return a pending promise if instance is paused when it has active jobs / jobs in queue', async () => {
        let q = new Qyu({concurrency: 1});
        q.add(mockAsync);
        q.add(mockAsync);
        q.pause();
        expect(await getPromiseStatus(q.whenEmpty())).toBe('pending');
    });

    it('`whenEmpty` should return a resolved promise if instance is paused when idle, then immediately resumed', async () => {
        let q = new Qyu;
        q.pause();
        q.resume();
        expect(await getPromiseStatus(q.whenEmpty())).toBe('resolved');
    });
});

describe('The `set` method', () => {
    describe('if passed a new concurrency value', () => {
        it('if new value is bigger than previous, will immediately call more jobs as much as the difference from previous value', async () => {
            let q = new Qyu({concurrency: 1});
            let fn1 = jest.fn(mockAsync);
            let fn2 = jest.fn(mockAsync);
            let fn3 = jest.fn(mockAsync);
            let fn4 = jest.fn(mockAsync);

            q.add(fn1);
            q.add(fn2);
            q.add(fn3);
            q.add(fn4);

            q.set({concurrency: 3});

            expect(fn1).toHaveBeenCalled();
            expect(fn2).toHaveBeenCalled();
            expect(fn3).toHaveBeenCalled();
            expect(fn4).not.toHaveBeenCalled();
        });
    });

    describe('if passed a new capacity value', () => {
        it('if new value is lower than previous, will immediately reject the last jobs in queue as much as the difference from previous value', async () => {
            let q = new Qyu({concurrency: 1, capacity: 4});

            let fn1 = jest.fn(mockAsync);
            let fn2 = jest.fn(mockAsync);
            let fn3 = jest.fn(mockAsync);
            let fn4 = jest.fn(mockAsync);
            let fn5 = jest.fn(mockAsync);

            let p1 = q.add(fn1);
            let p2 = q.add(fn2);
            let p3 = q.add(fn3);
            let p4 = q.add(fn4);
            let p5 = q.add(fn5);

            q.set({capacity: 2});

            expect(await getPromiseStatus([p2, p3, p4, p5])).toMatchObject(['pending', 'pending', 'rejected', 'rejected']);
        });
    });
});
