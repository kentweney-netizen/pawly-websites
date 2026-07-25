import { type RoundingMode } from '../rounding';
import type { Signedness } from '../signedness';
import type { BinaryFixedPoint } from './core';
/**
 * Adds two {@link BinaryFixedPoint} values of the same shape and returns
 * the result at the same shape.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` if the two operands
 * differ in signedness, total bits, or fractional bits, and
 * `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` if the sum does not
 * fit the target shape.
 *
 * @example
 * ```ts
 * const usd = binaryFixedPoint('signed', 32, 16);
 * addBinaryFixedPoint(usd('1.5'), usd('2.25')); // represents 3.75
 * ```
 *
 * @see {@link subtractBinaryFixedPoint}
 */
export declare function addBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>, b: NoInfer<BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>>): BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Subtracts `b` from `a` where both are {@link BinaryFixedPoint} values of
 * the same shape, and returns the result at the same shape.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` if the two operands
 * differ in shape, and `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW`
 * if the difference does not fit the target shape.
 *
 * @see {@link addBinaryFixedPoint}
 */
export declare function subtractBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>, b: NoInfer<BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>>): BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Multiplies a {@link BinaryFixedPoint} by a scalar.
 *
 * The second operand may be another {@link BinaryFixedPoint} with the same
 * signedness (any total bits or fractional bits) or a bare `bigint`. The
 * result always has `a`'s shape.
 *
 * Multiplication by a same-kind fixed-point rescales the product back to
 * `a`'s scale. When that rescaling is not exact, the optional
 * {@link RoundingMode} is consulted; it defaults to `'strict'` and throws
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` in that case.
 *
 * @example
 * ```ts
 * const audioSample = binaryFixedPoint('signed', 16, 15);
 * multiplyBinaryFixedPoint(audioSample('0.6'), audioSample('0.8')); // represents 0.48
 * multiplyBinaryFixedPoint(audioSample('0.5'), 2n);                 // represents 1.0 (overflows Q1.15)
 * ```
 *
 * @see {@link divideBinaryFixedPoint}
 */
export declare function multiplyBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>, b: BinaryFixedPoint<NoInfer<TSignedness>, number, number> | bigint, rounding?: RoundingMode): BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Divides a {@link BinaryFixedPoint} by a scalar.
 *
 * The second operand may be another {@link BinaryFixedPoint} with the same
 * signedness (any total bits or fractional bits) or a bare `bigint`. The
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
 * const q1_15 = binaryFixedPoint('signed', 16, 15);
 * divideBinaryFixedPoint(q1_15('0.5'), q1_15('0.25')); // represents 2.0 (overflows)
 * divideBinaryFixedPoint(q1_15('0.5'), 2n);            // represents 0.25
 * ```
 *
 * @see {@link multiplyBinaryFixedPoint}
 */
export declare function divideBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>, b: BinaryFixedPoint<NoInfer<TSignedness>, number, number> | bigint, rounding?: RoundingMode): BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Returns the additive inverse of a signed {@link BinaryFixedPoint}.
 *
 * Unsigned values are rejected at the type level; they are also rejected
 * at runtime with `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` in case the
 * type safety is bypassed. Negating the minimum representable value
 * overflows and throws `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW`.
 *
 * @see {@link absoluteBinaryFixedPoint}
 */
export declare function negateBinaryFixedPoint<TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<'signed', TTotalBits, TFractionalBits>): BinaryFixedPoint<'signed', TTotalBits, TFractionalBits>;
/**
 * Returns the absolute value of a {@link BinaryFixedPoint}. Unsigned
 * inputs are returned unchanged.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` when taking the
 * absolute value of the minimum representable signed value, which has no
 * positive counterpart in two's-complement.
 *
 * @see {@link negateBinaryFixedPoint}
 */
export declare function absoluteBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(a: BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>): BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
//# sourceMappingURL=arithmetics.d.ts.map