export { promiseWithResolvers, type PromiseWithResolvers };

const promiseWithResolvers: <T>() => PromiseWithResolvers<T> =
  'withResolvers' in Promise
    ? () => Promise.withResolvers()
    : /**
       * A ponyfill for the [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) helper
       * @returns A pending {@link PromiseWithResolvers} instance for use
       */
      function promiseWithResolversPonyfill<T>(): PromiseWithResolvers<T> {
        let resolve!: PromiseWithResolvers<T>['resolve'];
        let reject!: PromiseWithResolvers<T>['reject'];
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
};
