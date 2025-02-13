## [2.1.2](https://github.com/shtaif/Qyu/compare/v2.1.1...v2.1.2) (2025-02-13)


### Documentation

* **readme:** add docs for canceling jobs mid-operation ([#48](https://github.com/shtaif/Qyu/issues/48)) ([2907eb7](https://github.com/shtaif/Qyu/commit/2907eb701d5a540e562103becaeeb91df6e027e6))
* **readme:** align readme code blocks formatting inconsistencies ([#50](https://github.com/shtaif/Qyu/issues/50)) ([5c7438e](https://github.com/shtaif/Qyu/commit/5c7438e2a2e1b102b7e0ea7ebc5aad5f98971f6d))
* **readme:** fix code blocks inconsistent indentation to 2 spaces strictly ([#49](https://github.com/shtaif/Qyu/issues/49)) ([b1a4fcf](https://github.com/shtaif/Qyu/commit/b1a4fcf1534312cd27d7c8edcedd87f1eaae64df))

## [2.1.1](https://github.com/shtaif/Qyu/compare/v2.1.0...v2.1.1) (2025-02-10)

# [2.1.0](https://github.com/shtaif/Qyu/compare/v2.0.0...v2.1.0) (2025-02-10)


### Features

* capability to abort queued jobs from being run ([#40](https://github.com/shtaif/Qyu/issues/40)) ([730c6a6](https://github.com/shtaif/Qyu/commit/730c6a6af49b5ac2b834981a92f5c024c689f2c2))

# [2.0.0](https://github.com/shtaif/Qyu/compare/v1.0.1...v2.0.0) (2025-02-10)


### Bug Fixes

* dep upgrades for fixing dependabot alert on `nanoid` https://github.com/shtaif/Qyu/security/dependabot/26 ([#31](https://github.com/shtaif/Qyu/issues/31)) ([2623387](https://github.com/shtaif/Qyu/commit/26233875d1bffc1fd6f478d7be6148c75cf25b44))


* chore!: bump minimum node version requirement to `>=10.24` for now (#39) ([8bc01d0](https://github.com/shtaif/Qyu/commit/8bc01d016457658189e3360a82eadbf858b72106)), closes [#39](https://github.com/shtaif/Qyu/issues/39)


### BREAKING CHANGES

* Drop support for Node.js versions below `10.24`

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.1](https://github.com/shtaif/qyu/compare/v1.0.0...v1.0.1) (2022-10-21)


### Bug Fixes

* dev dependencies security related bumps ([#21](https://github.com/shtaif/qyu/issues/21)) ([146f9ea](https://github.com/shtaif/qyu/commit/146f9eada069d53653e06c0115cabee260b339ac))

## [1.0.0](https://github.com/shtaif/qyu/compare/v0.7.1...v1.0.0) (2022-10-21)


### ⚠ BREAKING CHANGES

* enqueuing API next iteration (#18)

### Features

* enqueuing API next iteration ([#18](https://github.com/shtaif/qyu/issues/18)) ([36d82ad](https://github.com/shtaif/qyu/commit/36d82adb56ed16ee21e5bbe74cdb3485d7834ed6))

### [0.7.1](https://github.com/shtaif/qyu/compare/v0.7.0...v0.7.1) (2022-10-07)

## [0.7.0](https://github.com/shtaif/qyu/compare/v0.6.0...v0.7.0) (2022-10-07)


### ⚠ BREAKING CHANGES

* remove whole user-provided argument injection behavior (#16)

### Features

* dual build process for both CommonJS and ES Modules formats ([#17](https://github.com/shtaif/qyu/issues/17)) ([51f8c6f](https://github.com/shtaif/qyu/commit/51f8c6f1a7ad72917f960d3ad017e1ab9b812002))


* remove whole user-provided argument injection behavior ([#16](https://github.com/shtaif/qyu/issues/16)) ([8cdbc96](https://github.com/shtaif/qyu/commit/8cdbc96d56d30ce5470cec78c3b90ac918f57b5b))

## [0.7.0](https://github.com/shtaif/qyu/compare/v0.6.0...v0.7.0) (2022-10-07)


### ⚠ BREAKING CHANGES

* remove whole user-provided argument injection behavior (#16)

### Features

* dual build process for both CommonJS and ES Modules formats ([#17](https://github.com/shtaif/qyu/issues/17)) ([51f8c6f](https://github.com/shtaif/qyu/commit/51f8c6f1a7ad72917f960d3ad017e1ab9b812002))


* remove whole user-provided argument injection behavior ([#16](https://github.com/shtaif/qyu/issues/16)) ([8cdbc96](https://github.com/shtaif/qyu/commit/8cdbc96d56d30ce5470cec78c3b90ac918f57b5b))

## [0.6.0](https://github.com/shtaif/qyu/compare/v0.5.1...v0.6.0) (2022-09-27)


### Features

* refactor entire project into TypeScript ([#10](https://github.com/shtaif/qyu/issues/10)) ([07ec903](https://github.com/shtaif/qyu/commit/07ec9035ce02ae9293bf1af19e6189dd0672edce))

### [0.5.1](https://github.com/shtaif/qyu/compare/v0.5.0...v0.5.1) (2022-09-27)


### Bug Fixes

* `license` entry on `package.json` from `ISC` to `MIT` following up with the recently merged PR ([#14](https://github.com/shtaif/qyu/issues/14)) ([0ecc648](https://github.com/shtaif/qyu/commit/0ecc648fe8d5ad99cfcc4f8fe557db4455071716))

## 0.5.0 (2022-09-27)


### ⚠ BREAKING CHANGES

* remove stream-related features (were incomplete and undocumented anyway) - intended for making project browser-compatible (#11)

### Bug Fixes

* add yarn.lock file into source control properly ([#3](https://github.com/shtaif/qyu/issues/3)) ([abdbde0](https://github.com/shtaif/qyu/commit/abdbde03d92f567baf88eb9fef752bdcb7caebc0))


* remove stream-related features (were incomplete and undocumented anyway) - intended for making project browser-compatible ([#11](https://github.com/shtaif/qyu/issues/11)) ([62591e0](https://github.com/shtaif/qyu/commit/62591e0bca67df0b8db2660f633cce0c90e99064))
