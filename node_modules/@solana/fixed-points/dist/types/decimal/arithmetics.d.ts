import { type RoundingMode } from '../rounding';
import type { Signedness } from '../signedness';
import type { DecimalFixedPoint } from './core';
/**
 * Adds two {@link DecimalFixedPoint} values of the same shape and returns
 * the result at the same shape.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` if the two operands
 * differ in signedness, total bits, or decimals, and
 * `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` if the sum does not
 * fit the target shape.
 *
 * @example
 * ```ts
 * const usd = decimalFixedPoint('unsigned', 64, 2);
 * addDecimalFixedPoint(usd('1.50'), usd('2.25')); // represents 3.75
 * ```
 *
 * @see {@link subtractDecimalFixedPoint}
 */
export declare function addDecimalFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, b: NoInfer<DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>>): DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>;
/**
 * Subtracts `b` from `a` where both are {@link DecimalFixedPoint} values
 * of the same shape, and returns the result at the same shape.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` if the two operands
 * differ in shape, and `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW`
 * if the difference does not fit the target shape.
 *
 * @see {@link addDecimalFixedPoint}
 */
export declare function subtractDecimalFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, b: NoInfer<DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>>): DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>;
/**
 * Multiplies a {@link DecimalFixedPoint} by a scalar.
 *
 * The second operand may be another {@link DecimalFixedPoint} with the
 * same signedness (any total bits or decimals) or a bare `bigint`. The
 * result always has `a`'s shape.
 *
 * Multiplication by a same-kind fixed-point rescales the product back to
 * `a`'s scale. When that rescaling is not exact, the optional
 * {@link RoundingMode} is consulted; it defaults to `'strict'` and throws
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` in that case.
 *
 * @example
 * ```ts
 * const usd = decimalFixedPoint('unsigned', 64, 2);
 * const rate = decimalFixedPoint('unsigned', 64, 4);
 * multiplyDecimalFixedPoint(usd('100'), rate('0.0025')); // represents 0.25
 * multiplyDecimalFixedPoint(usd('1.50'), 3n);             // represents 4.50
 * ```
 *
 * @see {@link divideDecimalFixedPoint}
 */
export declare function multiplyDecimalFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, b: DecimalFixedPoint<NoInfer<TSignedness>, number, number> | bigint, rounding?: RoundingMode): DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>;
/**
 * Divides a {@link DecimalFixedPoint} by a scalar.
 *
 * The second operand may be another {@link DecimalFixedPoint} with the
 * same signedness (any total bits or decimals) or a bare `bigint`. The
 * result always has `a`'s shape.
 *
 * The optional {@link RoundingMode} is consulted whenever the division is
 * inexact; it defaults to `'strict'` and throws
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` in that case.
 * A zero divisor always throws
 * `SOLANA_ERROR__FIXED_POINTS__DIVISION_BY_ZERO`.
 *
 * @example
 * ```ts
 * const usd = decimalFixedPoint('unsigned', 64, 2);
 * const rate = decimalFixedPoint('unsigned', 64, 4);
 * divideDecimalFixedPoint(usd('10'), rate('0.05'));   // represents 200.00
 * divideDecimalFixedPoint(usd('10.50'), 3n, 'round'); // represents 3.50
 * ```
 *
 * @see {@link multiplyDecimalFixedPoint}
 */
export declare function divideDecimalFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, b: DecimalFixedPoint<NoInfer<TSignedness>, number, number> | bigint, rounding?: RoundingMode): DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>;
/**
 * Returns the additive inverse of a signed {@link DecimalFixedPoint}.
 *
 * Unsigned values are rejected at the type level; they are also rejected
 * at runtime with `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` in case the
 * type safety is bypassed. Negating the minimum representable value
 * overflows and throws `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW`.
 *
 * @see {@link absoluteDecimalFixedPoint}
 */
export declare function negateDecimalFixedPoint<TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<'signed', TTotalBits, TDecimals>): DecimalFixedPoint<'signed', TTotalBits, TDecimals>;
/**
 * Returns the absolute value of a {@link DecimalFixedPoint}. Unsigned
 * inputs are returned unchanged.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` when taking the
 * absolute value of the minimum representable signed value, which has no
 * positive counterpart in two's-complement.
 *
 * @see {@link negateDecimalFixedPoint}
 */
export declare function absoluteDecimalFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(a: DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>): DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>;
//# sourceMappingURL=arithmetics.d.ts.map