import { type RoundingMode } from '../rounding';
import type { Signedness } from '../signedness';
import type { BinaryFixedPoint } from './core';
/**
 * Converts a {@link BinaryFixedPoint} to its exact base-10 representation
 * as a `(raw, decimals)` pair such that the mathematical value equals
 * `raw / 10 ** decimals`.
 *
 * Because `1 / 2 ** F` has a finite decimal expansion of exactly `F`
 * digits, the conversion is always lossless:
 * `raw / 2 ** F === (raw * 5 ** F) / 10 ** F`. The transformed raw
 * therefore carries exactly `fractionalBits` decimal digits of
 * precision.
 *
 * Useful when you want to feed a binary fixed-point into a tool that
 * understands base-10 scaled integers (such as `Intl.NumberFormat`'s
 * string scientific notation).
 *
 * @example
 * ```ts
 * const q1_15 = binaryFixedPoint('signed', 16, 15);
 * binaryFixedPointToBase10(q1_15('0.5'));
 * // { raw: 500000000000000n, decimals: 15 }
 * ```
 *
 * @see {@link BinaryFixedPoint}
 */
export declare function binaryFixedPointToBase10(value: BinaryFixedPoint<Signedness, number, number>): {
    decimals: number;
    raw: bigint;
};
/**
 * Converts a {@link BinaryFixedPoint} to its unsigned equivalent at the
 * same `totalBits` and `fractionalBits`.
 *
 * Unsigned inputs are returned by reference unchanged; signed inputs are
 * accepted as long as their raw value is non-negative.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__VALUE_OUT_OF_RANGE` when the input
 * represents a negative value that cannot be stored as unsigned.
 *
 * @example
 * ```ts
 * const signedUsd = binaryFixedPoint('signed', 16, 8);
 * toUnsignedBinaryFixedPoint(signedUsd('1.5')); // unsigned, raw unchanged
 * toUnsignedBinaryFixedPoint(signedUsd('-1'));  // throws
 * ```
 *
 * @see {@link toSignedBinaryFixedPoint}
 */
export declare function toUnsignedBinaryFixedPoint<TTotalBits extends number, TFractionalBits extends number>(value: BinaryFixedPoint<Signedness, TTotalBits, TFractionalBits>): BinaryFixedPoint<'unsigned', TTotalBits, TFractionalBits>;
/**
 * Converts a {@link BinaryFixedPoint} to its signed equivalent at the same
 * `totalBits` and `fractionalBits`.
 *
 * Signed inputs are returned by reference unchanged; unsigned inputs are
 * accepted as long as their raw value fits the signed range, i.e.
 * `raw <= 2 ** (totalBits - 1) - 1`.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__VALUE_OUT_OF_RANGE` when the input's
 * raw value exceeds the maximum representable signed value at its
 * `totalBits`.
 *
 * @example
 * ```ts
 * const unsigned = rawBinaryFixedPoint('unsigned', 8, 0);
 * toSignedBinaryFixedPoint(unsigned(100n)); // signed, raw === 100n
 * toSignedBinaryFixedPoint(unsigned(200n)); // throws (200 > 127)
 * ```
 *
 * @see {@link toUnsignedBinaryFixedPoint}
 */
export declare function toSignedBinaryFixedPoint<TTotalBits extends number, TFractionalBits extends number>(value: BinaryFixedPoint<Signedness, TTotalBits, TFractionalBits>): BinaryFixedPoint<'signed', TTotalBits, TFractionalBits>;
/**
 * Returns a {@link BinaryFixedPoint} with the same signedness as `value`
 * but a new `totalBits` and `fractionalBits`. If the requested shape
 * matches the input shape, the same reference is returned.
 *
 * Scale-up (higher `fractionalBits`) is always exact. Scale-down (lower
 * `fractionalBits`) is potentially lossy; the optional {@link RoundingMode}
 * is consulted on inexact results and defaults to `'strict'`, which throws
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS`.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` when the
 * rescaled raw value does not fit the new `totalBits`.
 *
 * @example
 * ```ts
 * const q1_15 = binaryFixedPoint('signed', 16, 15);
 * rescaleBinaryFixedPoint(q1_15('0.5'), 32, 30);          // wider, higher precision
 * rescaleBinaryFixedPoint(q1_15('0.5'), 16, 8, 'floor');  // lower precision, explicit rounding
 * ```
 *
 * @see {@link toSignedBinaryFixedPoint}
 * @see {@link toUnsignedBinaryFixedPoint}
 */
export declare function rescaleBinaryFixedPoint<TSignedness extends Signedness, TNewTotalBits extends number, TNewFractionalBits extends number>(value: BinaryFixedPoint<TSignedness, number, number>, newTotalBits: TNewTotalBits, newFractionalBits: TNewFractionalBits, rounding?: RoundingMode): BinaryFixedPoint<TSignedness, TNewTotalBits, TNewFractionalBits>;
//# sourceMappingURL=conversions.d.ts.map