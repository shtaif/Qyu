import 'chai-as-promised';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { Qyu } from '../spec/libraryEntrypoint.js';
import { getPromiseStatus, mockAsyncFn } from './testUtils/index.js';

describe('The `pause`/`resume` methods', () => {
  it('`pause` method should return a promise that is immediately resolved if no active jobs were at the time of calling `pause`', async () => {
    const q = new Qyu();
    const promise = q.pause();
    expect(await getPromiseStatus(promise)).to.equal('resolved');
  });

  it('`pause` method should return a promise that resolves when all active jobs are done', async () => {
    const q = new Qyu();
    const fn1 = sinon.spy(mockAsyncFn);
    const fn2 = sinon.spy(mockAsyncFn);

    const p1 = q.add(fn1);
    const p2 = q.add(fn2);

    await q.pause();

    expect(fn1.called).to.be.true;
    expect(fn2.notCalled).to.be.true;
    expect(await getPromiseStatus([p1, p2])).to.deep.equal(['resolved', 'pending']);
  });

  it('`whenEmpty` should return a pending promise if instance is paused when idle', async () => {
    const q = new Qyu();
    q.pause();
    expect(await getPromiseStatus(q.whenEmpty())).to.equal('pending');
  });

  it('`whenEmpty` should return a pending promise if instance is paused when it has active jobs / jobs in queue', async () => {
    const q = new Qyu({ concurrency: 1 });
    q.add(mockAsyncFn);
    q.add(mockAsyncFn);
    q.pause();
    expect(await getPromiseStatus(q.whenEmpty())).to.equal('pending');
  });

  it('`whenEmpty` should return a resolved promise if instance is paused when idle, then immediately resumed', async () => {
    const q = new Qyu();
    q.pause();
    q.resume();
    expect(await getPromiseStatus(q.whenEmpty())).to.equal('resolved');
  });
});

describe('The `set` method', () => {
  describe('if passed a new concurrency value', () => {
    it('if new value is bigger than previous, will immediately call more jobs as much as the difference from previous value', async () => {
      const q = new Qyu({ concurrency: 1 });
      const fn1 = sinon.spy(mockAsyncFn);
      const fn2 = sinon.spy(mockAsyncFn);
      const fn3 = sinon.spy(mockAsyncFn);
      const fn4 = sinon.spy(mockAsyncFn);
      q.add(fn1);
      q.add(fn2);
      q.add(fn3);
      q.add(fn4);
      q.set({ concurrency: 3 });
      expect(fn1.called).to.be.true;
      expect(fn2.called).to.be.true;
      expect(fn3.called).to.be.true;
      expect(fn4.notCalled).to.be.true;
    });
  });

  describe('if passed a new capacity value', () => {
    it('if new value is lower than previous, will immediately reject the last jobs in queue as much as the difference from previous value', async () => {
      const q = new Qyu({ concurrency: 1, capacity: 4 });
      const fn1 = sinon.spy(mockAsyncFn);
      const fn2 = sinon.spy(mockAsyncFn);
      const fn3 = sinon.spy(mockAsyncFn);
      const fn4 = sinon.spy(mockAsyncFn);
      const fn5 = sinon.spy(mockAsyncFn);
      const p1 = q.add(fn1);
      const p2 = q.add(fn2);
      const p3 = q.add(fn3);
      const p4 = q.add(fn4);
      const p5 = q.add(fn5);
      q.set({ capacity: 2 });
      expect(await getPromiseStatus([p2, p3, p4, p5])).to.deep.equal([
        'pending',
        'pending',
        'rejected',
        'rejected',
      ]);
    });
  });
});
