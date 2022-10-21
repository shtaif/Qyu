- Implement builds for CommonJS + ESM similarly to what's done on https://github.com/openapi-contrib/openapi-schema-to-json-schema/blob/main/package.json#L18 and also with a little more complexity on RxJS's repo

- Possible to combine all the generated type declaration files into a one centralized `index.d.ts` file located at the package root?

- Add an installation section on `README.md`

- Whenever's possible, re-release as version `1.0.0`

- Go through entire `README.md`, most importantly probably convert all imports from `require`s to `import` statements

- As Igal suggested, expose a way to tell whether the queue is currently "free" or not (not to be confused with the `.whenFree()` method)

- Possibly replace all the initial `null` values all around here into `undefined`

- Make all nullable numeric options to be defaulted to `Infinity` to normalize all operations on them and their type checks

- Make up and extract out subtypes of the QyuError for each possible error

- Should I drop the current support for Node.js 7.6.0 in favor of 10.x.x something?

- Upgrade prettier

- Devise and publicly expose a proper way to dequeue jobs

- Create JSDocs blocks for each exposed method