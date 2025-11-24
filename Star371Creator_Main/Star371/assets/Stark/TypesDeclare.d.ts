
/** 基礎建構式 */
declare type PlainCtor<T>       = { new(): T };

/** 帶參數的建構式 */
declare type CtorWithArgs<T>    = { new(...args: any[]): T };

/** 抽象建構式 */
declare type AbstractCtor<T>    = Function & { prototype: T };

/** 建構式 (不含抽象建構式) */
declare type Constructable<T>   = PlainCtor<T> | CtorWithArgs<T>;

/** 建構式 */
declare type Ctor<T>            = AbstractCtor<T> | Constructable<T>;

/** Tween Easing 函數 */
declare type ccTweenEasing      = import("cc").TweenEasing | ((t: number) => number);

/** 可轉換成 `BigNumber` 的型別 */
declare type BigValuable        = string | number | BigNumber;

/**
 * 不穩定的數值
 * - 唯一值 `(number)`
 * - 數值範圍 `[min, max]`
 * - 不均勻分佈 `[min, max, 分佈函數 (r1)=>r2 ]` 函數參數 (r1) 與回傳值 (r2) 為 0 ~ 1 之間的比例值
 */
declare type UnstableNum        = number | [ number, number ] | [ number, number, (ratio: number)=>number ];
