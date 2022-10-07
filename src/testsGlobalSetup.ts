import mod from 'module';

(() => {
  /*
    It appears that `ts-mocha` errors out on import statements with paths having explicit `.js` extension.
    However, the `.js` extensions currently present on all imports across the project CANNOT be omitted for the sake of running the tests
    since without them, while TypeScript is able to accept extension-less imports as well (having set `"moduleResolution": "NodeNext"` in `tsconfig.json`),
    when fed such imports while compiling to an ESM format, it would output them as-are. ESM code with extension-less imports is
    INVALID ESM code, so the build output is actually non-executable even though it would complete without any issue from
    the TypeScript compilation.
    To work around this (only during test run-time) - we're patching Node's file import mechanism to intercept
    every `.js`-ending import path and feed it back to Node as itself-minus-the-`.js` extension. This way,
    as long as we've set `"module": "commonjs"` in `tsconfig.json` that accompanies our test runs, we can still write
    the entire code-base with "fully-qualified" ESM-compatible imports statements AS WELL AS have Mocha be able to
    execute over the same code without issues.
    Inspired by https://github.com/ReactiveX/rxjs/blob/6d011f0dc67b736adc0979d3bc14d93b49064efa/spec/support/mocha-path-mappings.js
  */

  const origResolveFilename = (mod as any)._resolveFilename;

  (mod as any)._resolveFilename = function (path: string, ...rest: unknown[]) {
    const pathPossiblyPatched = path.endsWith('.js') ? path.slice(0, -3) : path;
    return origResolveFilename.call(this, pathPossiblyPatched, ...rest);
  };
})();

import chai from 'chai';
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiSubset);
chai.use(chaiAsPromised);
