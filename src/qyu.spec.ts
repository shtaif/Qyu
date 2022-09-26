import { expect } from 'chai';
import sinon from 'sinon';
import { Qyu, QyuError } from '.';
import { mockAsyncFn, delay, noop } from './testUtils';

// // Type definitions for chai-subset 1.3
// // Project: https://github.com/debitoor/chai-subset
// // Definitions by: Sam Noedel <https://github.com/delta62>, Andrew Brown <https://github.com/AGBrown>
// // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// // TypeScript Version: 3.0

// /// <reference types="chai" />

// declare global {
//   namespace Chai {
//     interface Assertion {
//       containSubset(expected: any): Assertion;
//     }
//     interface Assert {
//       containSubset(val: any, exp: any, msg?: string): void;
//     }
//   }
// }

// declare const chaiSubset: Chai.ChaiPlugin;
// export = chaiSubset;

// // Type definitions for chai-as-promised 7.1.0
// // Project: https://github.com/domenic/chai-as-promised/
// // Definitions by: jt000 <https://github.com/jt000>,
// //                 Yuki Kokubun <https://github.com/Kuniwak>,
// //                 Leonard Thieu <https://github.com/leonard-thieu>,
// //                 Mike Lazer-Walker <https://github.com/lazerwalker>,
// //                 Matt Bishop <https://github.com/mattbishop>
// //                 William Orr <https://github.com/worr>
// // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// // TypeScript Version: 3.0

// /// <reference types="chai" />

// declare module 'chai-as-promised' {
//   interface ChaiAsPromised extends Chai.ChaiPlugin {
//     transferPromiseness(
//       assertion: Chai.PromisedAssertion,
//       promise: PromiseLike<any>
//     ): void;
//     transformAsserterArgs(values: any[]): any;
//   }

//   const chaiAsPromised: ChaiAsPromised;
//   export = chaiAsPromised;
// }

// declare namespace Chai {
//   // For BDD API
//   interface Assertion
//     extends LanguageChains,
//       NumericComparison,
//       TypeComparison {
//     eventually: PromisedAssertion;
//     become(expected: any): PromisedAssertion;
//     fulfilled: PromisedAssertion;
//     rejected: PromisedAssertion;
//     rejectedWith: PromisedThrow;
//     notify(fn: Function): PromisedAssertion;
//   }

//   // Eventually does not have .then(), but PromisedAssertion have.
//   interface Eventually
//     extends PromisedLanguageChains,
//       PromisedNumericComparison,
//       PromisedTypeComparison {
//     // From chai-as-promised
//     become(expected: any): PromisedAssertion;
//     fulfilled: PromisedAssertion;
//     rejected: PromisedAssertion;
//     rejectedWith: PromisedThrow;
//     notify(fn: Function): PromisedAssertion;

//     // From chai
//     not: PromisedAssertion;
//     deep: PromisedDeep;
//     ordered: PromisedOrdered;
//     nested: PromisedNested;
//     any: PromisedKeyFilter;
//     all: PromisedKeyFilter;
//     a: PromisedTypeComparison;
//     an: PromisedTypeComparison;
//     include: PromisedInclude;
//     contain: PromisedInclude;
//     ok: PromisedAssertion;
//     true: PromisedAssertion;
//     false: PromisedAssertion;
//     null: PromisedAssertion;
//     undefined: PromisedAssertion;
//     NaN: PromisedAssertion;
//     exist: PromisedAssertion;
//     empty: PromisedAssertion;
//     arguments: PromisedAssertion;
//     Arguments: PromisedAssertion;
//     equal: PromisedEqual;
//     equals: PromisedEqual;
//     eq: PromisedEqual;
//     eql: PromisedEqual;
//     eqls: PromisedEqual;
//     property: PromisedProperty;
//     ownProperty: PromisedOwnProperty;
//     haveOwnProperty: PromisedOwnProperty;
//     ownPropertyDescriptor: PromisedOwnPropertyDescriptor;
//     haveOwnPropertyDescriptor: PromisedOwnPropertyDescriptor;
//     length: PromisedLength;
//     lengthOf: PromisedLength;
//     match: PromisedMatch;
//     matches: PromisedMatch;
//     string(string: string, message?: string): PromisedAssertion;
//     keys: PromisedKeys;
//     key(string: string): PromisedAssertion;
//     throw: PromisedThrow;
//     throws: PromisedThrow;
//     Throw: PromisedThrow;
//     respondTo: PromisedRespondTo;
//     respondsTo: PromisedRespondTo;
//     itself: PromisedAssertion;
//     satisfy: PromisedSatisfy;
//     satisfies: PromisedSatisfy;
//     closeTo: PromisedCloseTo;
//     approximately: PromisedCloseTo;
//     members: PromisedMembers;
//     increase: PromisedPropertyChange;
//     increases: PromisedPropertyChange;
//     decrease: PromisedPropertyChange;
//     decreases: PromisedPropertyChange;
//     change: PromisedPropertyChange;
//     changes: PromisedPropertyChange;
//     extensible: PromisedAssertion;
//     sealed: PromisedAssertion;
//     frozen: PromisedAssertion;
//     oneOf(list: any[], message?: string): PromisedAssertion;
//   }

//   interface PromisedAssertion extends Eventually, PromiseLike<any> {}

//   interface PromisedLanguageChains {
//     eventually: Eventually;

//     // From chai
//     to: PromisedAssertion;
//     be: PromisedAssertion;
//     been: PromisedAssertion;
//     is: PromisedAssertion;
//     that: PromisedAssertion;
//     which: PromisedAssertion;
//     and: PromisedAssertion;
//     has: PromisedAssertion;
//     have: PromisedAssertion;
//     with: PromisedAssertion;
//     at: PromisedAssertion;
//     of: PromisedAssertion;
//     same: PromisedAssertion;
//     but: PromisedAssertion;
//     does: PromisedAssertion;
//   }

//   interface PromisedNumericComparison {
//     above: PromisedNumberComparer;
//     gt: PromisedNumberComparer;
//     greaterThan: PromisedNumberComparer;
//     least: PromisedNumberComparer;
//     gte: PromisedNumberComparer;
//     below: PromisedNumberComparer;
//     lt: PromisedNumberComparer;
//     lessThan: PromisedNumberComparer;
//     most: PromisedNumberComparer;
//     lte: PromisedNumberComparer;
//     within(start: number, finish: number, message?: string): PromisedAssertion;
//   }

//   interface PromisedNumberComparer {
//     (value: number, message?: string): PromisedAssertion;
//   }

//   interface PromisedTypeComparison {
//     (type: string, message?: string): PromisedAssertion;
//     instanceof: PromisedInstanceOf;
//     instanceOf: PromisedInstanceOf;
//   }

//   interface PromisedInstanceOf {
//     (constructor: Object, message?: string): PromisedAssertion;
//   }

//   interface PromisedCloseTo {
//     (expected: number, delta: number, message?: string): PromisedAssertion;
//   }

//   interface PromisedNested {
//     include: PromisedInclude;
//     property: PromisedProperty;
//     members: PromisedMembers;
//   }

//   interface PromisedDeep {
//     equal: PromisedEqual;
//     equals: PromisedEqual;
//     eq: PromisedEqual;
//     include: PromisedInclude;
//     property: PromisedProperty;
//     members: PromisedMembers;
//     ordered: PromisedOrdered;
//   }

//   interface PromisedOrdered {
//     members: PromisedMembers;
//   }

//   interface PromisedKeyFilter {
//     keys: PromisedKeys;
//   }

//   interface PromisedEqual {
//     (value: any, message?: string): PromisedAssertion;
//   }

//   interface PromisedProperty {
//     (name: string | symbol, value?: any, message?: string): PromisedAssertion;
//   }

//   interface PromisedOwnProperty {
//     (name: string | symbol, message?: string): PromisedAssertion;
//   }

//   interface PromisedOwnPropertyDescriptor {
//     (
//       name: string | symbol,
//       descriptor: PropertyDescriptor,
//       message?: string
//     ): PromisedAssertion;
//     (name: string | symbol, message?: string): PromisedAssertion;
//   }

//   interface PromisedLength
//     extends PromisedLanguageChains,
//       PromisedNumericComparison {
//     (length: number, message?: string): PromisedAssertion;
//   }

//   interface PromisedInclude {
//     (value: Object, message?: string): PromisedAssertion;
//     (value: string, message?: string): PromisedAssertion;
//     (value: number, message?: string): PromisedAssertion;
//     keys: PromisedKeys;
//     deep: PromisedDeep;
//     ordered: PromisedOrdered;
//     members: PromisedMembers;
//     any: PromisedKeyFilter;
//     all: PromisedKeyFilter;
//   }

//   interface PromisedMatch {
//     (regexp: RegExp | string, message?: string): PromisedAssertion;
//   }

//   interface PromisedKeys {
//     (...keys: string[]): PromisedAssertion;
//     (keys: any[]): PromisedAssertion;
//     (keys: Object): PromisedAssertion;
//   }

//   interface PromisedThrow {
//     (): PromisedAssertion;
//     (expected: string | RegExp, message?: string): PromisedAssertion;
//     (
//       constructor: Error | Function,
//       expected?: string | RegExp,
//       message?: string
//     ): PromisedAssertion;
//   }

//   interface PromisedRespondTo {
//     (method: string, message?: string): PromisedAssertion;
//   }

//   interface PromisedSatisfy {
//     (matcher: Function, message?: string): PromisedAssertion;
//   }

//   interface PromisedMembers {
//     (set: any[], message?: string): PromisedAssertion;
//   }

//   interface PromisedPropertyChange {
//     (object: Object, property: string, message?: string): PromisedAssertion;
//   }

//   // For Assert API
//   interface Assert {
//     eventually: PromisedAssert;
//     isFulfilled(promise: PromiseLike<any>, message?: string): PromiseLike<void>;
//     becomes(
//       promise: PromiseLike<any>,
//       expected: any,
//       message?: string
//     ): PromiseLike<void>;
//     doesNotBecome(
//       promise: PromiseLike<any>,
//       expected: any,
//       message?: string
//     ): PromiseLike<void>;
//     isRejected(promise: PromiseLike<any>, message?: string): PromiseLike<void>;
//     isRejected(
//       promise: PromiseLike<any>,
//       expected: any,
//       message?: string
//     ): PromiseLike<void>;
//     isRejected(
//       promise: PromiseLike<any>,
//       match: RegExp,
//       message?: string
//     ): PromiseLike<void>;
//     notify(fn: Function): PromiseLike<void>;
//   }

//   export interface PromisedAssert {
//     fail(
//       actual?: PromiseLike<any>,
//       expected?: any,
//       msg?: string,
//       operator?: string
//     ): PromiseLike<void>;

//     isOk(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     ok(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotOk(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     notOk(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     equal(act: PromiseLike<any>, exp: any, msg?: string): PromiseLike<void>;
//     notEqual(act: PromiseLike<any>, exp: any, msg?: string): PromiseLike<void>;

//     strictEqual(
//       act: PromiseLike<any>,
//       exp: any,
//       msg?: string
//     ): PromiseLike<void>;
//     notStrictEqual(
//       act: PromiseLike<any>,
//       exp: any,
//       msg?: string
//     ): PromiseLike<void>;

//     deepEqual(act: PromiseLike<any>, exp: any, msg?: string): PromiseLike<void>;
//     notDeepEqual(
//       act: PromiseLike<any>,
//       exp: any,
//       msg?: string
//     ): PromiseLike<void>;

//     isAbove(
//       val: PromiseLike<number>,
//       above: number,
//       msg?: string
//     ): PromiseLike<void>;
//     isAtLeast(
//       val: PromiseLike<number>,
//       atLeast: number,
//       msg?: string
//     ): PromiseLike<void>;
//     isAtBelow(
//       val: PromiseLike<number>,
//       below: number,
//       msg?: string
//     ): PromiseLike<void>;
//     isAtMost(
//       val: PromiseLike<number>,
//       atMost: number,
//       msg?: string
//     ): PromiseLike<void>;

//     isTrue(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isFalse(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isNotTrue(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotFalse(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isNull(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotNull(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isNaN(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotNaN(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     exists(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     notExists(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isUndefined(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isDefined(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isFunction(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotFunction(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isObject(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotObject(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isArray(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotArray(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isString(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotString(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isNumber(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotNumber(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isFinite(val: PromiseLike<number>, msg?: string): PromiseLike<void>;

//     isBoolean(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotBoolean(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     typeOf(
//       val: PromiseLike<any>,
//       type: string,
//       msg?: string
//     ): PromiseLike<void>;
//     notTypeOf(
//       val: PromiseLike<any>,
//       type: string,
//       msg?: string
//     ): PromiseLike<void>;

//     instanceOf(
//       val: PromiseLike<any>,
//       type: Function,
//       msg?: string
//     ): PromiseLike<void>;
//     notInstanceOf(
//       val: PromiseLike<any>,
//       type: Function,
//       msg?: string
//     ): PromiseLike<void>;

//     include(
//       exp: PromiseLike<string>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;
//     include(exp: PromiseLike<any[]>, inc: any, msg?: string): PromiseLike<void>;

//     notInclude(
//       exp: PromiseLike<string>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;
//     notInclude(
//       exp: PromiseLike<any[]>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;

//     deepInclude(
//       exp: PromiseLike<string>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;
//     deepInclude(
//       exp: PromiseLike<any[]>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;

//     notDeepInclude(
//       exp: PromiseLike<string>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;
//     notDeepInclude(
//       exp: PromiseLike<any[]>,
//       inc: any,
//       msg?: string
//     ): PromiseLike<void>;

//     nestedInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;
//     notNestedInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;

//     deepNestedInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;
//     notDeepNestedInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;

//     ownInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;
//     notOwnInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;

//     deepOwnInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;
//     notDeepOwnInclude(
//       exp: PromiseLike<Object>,
//       inc: Object,
//       msg?: string
//     ): PromiseLike<void>;

//     match(exp: PromiseLike<any>, re: RegExp, msg?: string): PromiseLike<void>;
//     notMatch(
//       exp: PromiseLike<any>,
//       re: RegExp,
//       msg?: string
//     ): PromiseLike<void>;

//     property(
//       obj: PromiseLike<Object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;
//     notProperty(
//       obj: PromiseLike<Object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;
//     deepProperty(
//       obj: PromiseLike<Object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;
//     notDeepProperty(
//       obj: PromiseLike<Object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;

//     propertyVal(
//       obj: PromiseLike<Object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;
//     propertyNotVal(
//       obj: PromiseLike<Object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;

//     deepPropertyVal(
//       obj: PromiseLike<Object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;
//     deepPropertyNotVal(
//       obj: PromiseLike<Object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;

//     nestedProperty(
//       obj: PromiseLike<object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;
//     notNestedProperty(
//       obj: PromiseLike<object>,
//       prop: string,
//       msg?: string
//     ): PromiseLike<void>;
//     nestedPropertyVal(
//       obj: PromiseLike<object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;
//     notNestedPropertyVal(
//       obj: PromiseLike<object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;

//     deepNestedPropertyVal(
//       obj: PromiseLike<object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;
//     notDeepNestedPropertyVal(
//       obj: PromiseLike<object>,
//       prop: string,
//       val: any,
//       msg?: string
//     ): PromiseLike<void>;

//     lengthOf(
//       exp: PromiseLike<any>,
//       len: number,
//       msg?: string
//     ): PromiseLike<void>;

//     hasAnyKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     hasAnyKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     hasAllKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     hasAllKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     containsAllKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     containsAllKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     doesNotHaveAnyKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotHaveAnyKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     doesNotHaveAllKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotHaveAllKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     hasAnyDeepKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     hasAnyDeepKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     hasAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     hasAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     containsAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     containsAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     doesNotHaveAnyDeepKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotHaveAnyDeepKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     doesNotHaveAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotHaveAllDeepKeys(
//       obj: PromiseLike<any>,
//       keys: object,
//       msg?: string
//     ): PromiseLike<void>;

//     //alias frenzy
//     throw(fn: Function, msg?: string): PromiseLike<void>;
//     throw(fn: Function, regExp: RegExp): PromiseLike<void>;
//     throw(fn: Function, errType: Function, msg?: string): PromiseLike<void>;
//     throw(fn: Function, errType: Function, regExp: RegExp): PromiseLike<void>;

//     throws(fn: Function, msg?: string): PromiseLike<void>;
//     throws(fn: Function, regExp: RegExp): PromiseLike<void>;
//     throws(fn: Function, errType: Function, msg?: string): PromiseLike<void>;
//     throws(fn: Function, errType: Function, regExp: RegExp): PromiseLike<void>;

//     Throw(fn: Function, msg?: string): PromiseLike<void>;
//     Throw(fn: Function, regExp: RegExp): PromiseLike<void>;
//     Throw(fn: Function, errType: Function, msg?: string): PromiseLike<void>;
//     Throw(fn: Function, errType: Function, regExp: RegExp): PromiseLike<void>;

//     doesNotThrow(fn: Function, msg?: string): PromiseLike<void>;
//     doesNotThrow(fn: Function, regExp: RegExp): PromiseLike<void>;
//     doesNotThrow(
//       fn: Function,
//       errType: Function,
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotThrow(
//       fn: Function,
//       errType: Function,
//       regExp: RegExp
//     ): PromiseLike<void>;

//     operator(
//       val: PromiseLike<any>,
//       operator: string,
//       val2: any,
//       msg?: string
//     ): PromiseLike<void>;
//     closeTo(
//       act: PromiseLike<number>,
//       exp: number,
//       delta: number,
//       msg?: string
//     ): PromiseLike<void>;
//     approximately(
//       act: PromiseLike<number>,
//       exp: number,
//       delta: number,
//       msg?: string
//     ): PromiseLike<void>;

//     sameMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     sameDeepMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     sameOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     notSameOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     sameDeepOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     notSameDeepOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     includeOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     notIncludeOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     includeDeepOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     notIncludeDeepOrderedMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     includeMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;
//     includeDeepMembers(
//       set1: PromiseLike<any[]>,
//       set2: any[],
//       msg?: string
//     ): PromiseLike<void>;

//     oneOf(val: PromiseLike<any>, list: any[], msg?: string): PromiseLike<void>;

//     changes(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     changesBy(
//       modifier: Function,
//       obj: object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotChange(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     changesButNotBy(
//       modifier: Function,
//       obj: object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;
//     increases(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     increasesBy(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotIncrease(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     increasesButNotBy(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;
//     decreases(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     decreasesBy(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;
//     doesNotDecrease(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       msg?: string
//     ): PromiseLike<void>;
//     decreasesButNotBy(
//       modifier: Function,
//       obj: Object,
//       property: string,
//       change: number,
//       msg?: string
//     ): PromiseLike<void>;

//     ifError(val: PromiseLike<any>, msg?: string): PromiseLike<void>;

//     isExtensible(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     isNotExtensible(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;

//     isSealed(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     sealed(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     isNotSealed(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     notSealed(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;

//     isFrozen(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     frozen(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     isNotFrozen(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;
//     notFrozen(obj: PromiseLike<Object>, msg?: string): PromiseLike<void>;

//     isEmpty(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//     isNotEmpty(val: PromiseLike<any>, msg?: string): PromiseLike<void>;
//   }
// }

describe('When A Qyu instance is invoked as a function', () => {
  it('with a function as the first arg - should internally call the `add` method with the job and options and injecting any additional args passed into it', () => {
    const q = new Qyu();
    const jobOpts = {};
    const addSpied = (q.add = sinon.spy()); // `sinon.spy(q, 'add')` doesn't work because `q` is a Proxy object
    q(noop, jobOpts, 'a', 'b', 'c', 'd');
    expect(addSpied.firstCall.args).to.deep.equal([
      noop,
      jobOpts,
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('with an array as the first arg - should internally call the `map` method with the array, function and options args passed into it', () => {
    const q = new Qyu();
    const arr = [1, 2, 3];
    const jobOpts = {};
    const mapSpied = (q.map = sinon.spy()); // `sinon.spy(q, 'map') doesn't work because `q` is a Proxy object
    q(arr, noop, jobOpts);
    expect(mapSpied.firstCall.args).to.deep.equal([arr, noop, jobOpts]);
  });
});

describe('`add` method', () => {
  it('calls the added functions immediately if currently running jobs are below the concurrency limit', () => {
    const q = new Qyu({ concurrency: 2 });
    const job1 = sinon.spy(mockAsyncFn);
    const job2 = sinon.spy(mockAsyncFn);
    q.add(job1);
    q.add(job2);
    expect(job1.calledOnce).to.be.true;
    expect(job2.calledOnce).to.be.true;
  });

  it('will not call added functions immediately if currently running jobs are at the concurrency limit', () => {
    const q = new Qyu({ concurrency: 1 });
    const job = sinon.spy();
    q.add(mockAsyncFn);
    q.add(job);
    expect(job.notCalled).to.be.true;
  });

  it('will not call added functions if they exceed the capacity limit', () => {
    const q = new Qyu({ concurrency: 1, capacity: 1 });
    const job1 = sinon.spy(mockAsyncFn);
    const job2 = sinon.spy(mockAsyncFn);
    q.add(job1);
    q.add(job2);
    expect(job1.calledOnce).to.be.true;
    expect(job2.notCalled).to.be.true;
  });

  it('will inject every 3rd and up additional arguments supplied to it to the job function itself', () => {
    const q = new Qyu();
    const job = sinon.spy();
    q.add(job, {}, 'a', 'b', 'c', 'd');
    expect(job.calledOnce).to.be.true;
    expect(job.firstCall.args).to.deep.equal(['a', 'b', 'c', 'd']);
  });

  // TODO: This test sometimes seems to experience some timing glitches that makes it fail; refactor it to be more reliable
  it('will delay in starting the next job queued, regardless of concurrency setting, by the specified amount of time if `rampUpTime` is more than zero', async () => {
    const rampUpTime = 100;
    const q = new Qyu({
      concurrency: 3,
      rampUpTime,
    });
    const job1 = sinon.spy(() => mockAsyncFn(undefined, 250));
    const job2 = sinon.spy(() => mockAsyncFn(undefined, 250));
    const job3 = sinon.spy(() => mockAsyncFn(undefined, 250));
    q.add(job1);
    q.add(job2);
    q.add(job3);
    expect(job1.calledOnce).to.be.true;
    expect(job2.calledOnce).to.be.false;
    expect(job3.calledOnce).to.be.false;
    await delay(rampUpTime + 20);
    expect(job2.calledOnce).to.be.true;
    expect(job3.calledOnce).to.be.false;
    await delay(rampUpTime + 20);
    expect(job3.calledOnce).to.be.true;
  });

  describe('should return a', () => {
    it('promise', () => {
      const q = new Qyu({});
      const promise = q.add(mockAsyncFn);
      expect(promise instanceof Promise).to.be.true;
      expect(promise).to.be.instanceof(Promise);
    });

    it('rejects immediately with a QyuError of code "ERR_CAPACITY_FULL" if instance capacity is full', async () => {
      const q = new Qyu({ capacity: 1 });

      q.add(mockAsyncFn);
      q.add(mockAsyncFn); // this queuing and the one above it fill the queue length up to 1 (the earlier was called immediately, and the current is then put in queue)
      const promise = q.add(mockAsyncFn); // this is expected to reject since the current length of queue should be 1 at that point, which equals to the max capacity of 1

      const err = await expect(promise).to.be.rejected;
      expect(err).to.be.instanceof(QyuError);
      expect(err.code).to.equal('ERR_CAPACITY_FULL');
    });

    it('that resolves only after the actual job is resolved', async () => {
      const q = new Qyu({});
      let done = false;

      const promise = q.add(async () => {
        await mockAsyncFn();
        done = true;
      });

      await expect(promise).to.be.fulfilled;
      expect(done).to.be.true;
    });

    it('and rejects only after the actual job is rejected', async () => {
      const q = new Qyu({});
      let done = false;

      const promise = q.add(async () => {
        await mockAsyncFn();
        done = true;
        throw new Error();
      });

      await expect(promise).to.be.rejected;
      expect(done).to.be.true;
    });

    it('with the value the job resolved with', async () => {
      const q = new Qyu({});
      const value = await q.add(() => mockAsyncFn('THE_VALUE'));
      expect(value).to.equal('THE_VALUE');
    });

    it('or with the value the job rejected with', async () => {
      const q = new Qyu({});
      const promise = q.add(async () => {
        throw await mockAsyncFn('THE_VALUE');
      });
      await expect(promise).to.eventually.be.rejected.and.equal('THE_VALUE');
    });
  });
});

describe('`map` method', () => {
  it("invokes the function in the second argument for each item in the first argument array with two arguments in itself: the item and it's index", () => {
    const q = new Qyu({ concurrency: 3 });
    const items = ['A', 'B', 'C'];
    const fn = sinon.spy();
    q.map(items, fn);
    expect(fn.args).to.deep.equal([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);
  });
});

describe('`whenEmpty` method', () => {
  it('should return a promise', () => {
    const q = new Qyu({});
    expect(q.whenEmpty()).to.be.instanceOf(Promise);
  });

  it('that resolves once a Qyu instance has no running or queued jobs, regardless if some jobs ended up fulfilled or rejected', async () => {
    const q = new Qyu({ concurrency: 2 });
    let finishedCount = 0;

    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
    });
    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
      throw new Error();
    });
    q.add(async () => {
      await mockAsyncFn();
      finishedCount++;
    });

    await q.whenEmpty();

    expect(finishedCount).to.equal(3);
  });
});

describe('`empty` method', () => {
  it('should reject all queued jobs with a QyuError of code "ERR_JOB_DEQUEUED" and not call them', async () => {
    const q = new Qyu({ concurrency: 1 });
    const fn = sinon.spy(mockAsyncFn);

    const [, prom1, prom2] = [q.add(fn), q.add(fn), q.add(fn)];

    q.empty();

    await expect(prom1)
      .to.be.eventually.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_DEQUEUED' });

    await expect(prom2)
      .to.be.eventually.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_DEQUEUED' });

    expect(fn.calledOnce).to.be.true;
  });

  it('should return a promise that resolves once all active jobs at the time of calling are done', async () => {
    const q = new Qyu({ concurrency: 2 });
    let jobsDoneCount = 0;
    const job = async () => {
      await mockAsyncFn();
      jobsDoneCount++;
    };
    q.add(job);
    q.add(job);
    q.add(job);
    await q.empty();
    expect(jobsDoneCount).to.equal(2);
  });
});

describe('`whenFree` method', () => {
  it('should return a promise', () => {
    const q = new Qyu({});
    expect(q.whenFree()).to.be.instanceOf(Promise);
  });

  it('that resolves once number of currently running jobs get below the concurrency limit', async () => {
    let startedCount = 0;
    let finishedCount = 0;
    const q = new Qyu({ concurrency: 2 });
    const job = async () => {
      startedCount++;
      await mockAsyncFn();
      finishedCount++;
    };
    for (let i = 0; i < 3; ++i) {
      q.add(job);
    }
    await q.whenFree();
    expect(startedCount).to.equal(3);
    expect(finishedCount).to.equal(2);
  });
});

describe('The `timeout` option, when adding a task', () => {
  it('should cancel a queued job if waits in queue more than the specified time', async () => {
    const q = new Qyu({ concurrency: 1 });
    const fn = sinon.spy();
    const promise = q.add(() => mockAsyncFn(undefined, 100));
    q.add(fn, { timeout: 50 });
    await promise;
    expect(fn.notCalled).to.be.true;
  });

  it('if waits in queue more than the specified time, should make the promise of a job queueing reject with a QyuError of code "ERR_JOB_TIMEOUT"', async () => {
    const q = new Qyu({ concurrency: 1 });

    const promise = q.add(() => mockAsyncFn(undefined, 100));
    const promiseWithTimeout = q.add(() => mockAsyncFn(undefined, 0), {
      timeout: 50,
    });

    await expect(promise).to.eventually.be.fulfilled;
    await expect(promiseWithTimeout)
      .to.eventually.be.rejected.and.be.instanceOf(QyuError)
      .and.contain({ code: 'ERR_JOB_TIMEOUT' });
  });
});

describe('The `priority` option, when adding a task', () => {
  it('will default to 0', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('a'), { priority: -1 }),
      q.add(() => actualOrder.push('b'), { priority: 1 }),
      q.add(() => actualOrder.push('c'), {}),
    ]);
    expect(actualOrder).to.deep.equal(['b', 'c', 'a']);
  });

  it('will queue jobs with the same priority by the order they were added', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('a'), { priority: 0 }),
      q.add(() => actualOrder.push('b'), { priority: 0 }),
      q.add(() => actualOrder.push('c'), { priority: 0 }),
      q.add(() => actualOrder.push('d'), { priority: 0 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });

  it('if currently running jobs are at the concurrency limit, queue a job AFTER jobs with more or equal priority, and BEFORE other jobs that have less priority if any', async () => {
    const q = new Qyu({ concurrency: 1 });
    const actualOrder: string[] = [];
    q.add(mockAsyncFn); // To increase the activity up to the max concurrency...
    await Promise.all([
      q.add(() => actualOrder.push('b'), { priority: 2 }),
      q.add(() => actualOrder.push('a'), { priority: 3 }),
      q.add(() => actualOrder.push('d'), { priority: 1 }),
      q.add(() => actualOrder.push('c'), { priority: 2 }),
    ]);
    expect(actualOrder).to.deep.equal(['a', 'b', 'c', 'd']);
  });
});
