// import '../node_modules/@types/node';
import mod from 'module';

(() => {
  /*
    Inspired by https://github.com/ReactiveX/rxjs/blob/6d011f0dc67b736adc0979d3bc14d93b49064efa/spec/support/mocha-path-mappings.js
    It appears that unlike TypeScript itself, `ts-mocha` errors on imports statements with paths that end
    with a `.js` extension, which ................................. // TODO: Finish this explanation...
  */

  const origResolveFilename = (mod as any)._resolveFilename;

  (mod as any)._resolveFilename = function (path, ...rest) {
    const pathPossiblyPatched = path.endsWith('.js') ? path.slice(0, -3) : path;
    return origResolveFilename.call(this, pathPossiblyPatched, ...rest);
  };
})();

import 'mocha';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
