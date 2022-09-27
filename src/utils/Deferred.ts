export default class Deferred<T> {
  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: any) => void;
  promise: Promise<T>;

  constructor() {
    this.resolve;
    this.reject;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
