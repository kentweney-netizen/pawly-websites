import { type RoundingMode } from '../rounding';
import type { Signedness } from '../signedness';
/**
 * A fixed-point number whose scale is a power of 2. The stored `raw` bigint
 * represents the mathematical value `raw / 2 ** fractionalBits`.
 *
 * Binary fixed-point is the fastest fractional representation to compute
 * with — rescaling is a bit shift — so it is the preferred choice for
 * audio samples, graphics, probabilities, and any other quantity where
 * performance matters and the scale does not need to align with decimal
 * digits.
 *
 * @typeParam TSignedness - Whether the value can be negative.
 * @typeParam TTotalBits - The total number of bits used to store the raw value.
 * @typeParam TFractionalBits - The number of bits to the right of the binary point.
 *
 * @example
 * A 16-bit signed Q1.15 audio sample:
 * ```ts
 * type AudioSample = BinaryFixedPoint<'signed', 16, 15>;
 * ```
 *
 * @see {@link DecimalFixedPoint}
 * @see {@link Signedness}
 */
export type BinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number> = {
    readonly fractionalBits: TFractionalBits;
    readonly kind: 'binaryFixedPoint';
    readonly raw: bigint;
    readonly signedness: TSignedness;
    readonly totalBits: TTotalBits;
};
/**
 * Returns a factory that constructs {@link BinaryFixedPoint} values from
 * decimal strings.
 *
 * The outer call validates the shape parameters once and the returned
 * factory can be called many times to construct values of that shape.
 *
 * The input string is parsed as a decimal number and scaled by
 * `2 ** fractionalBits` to compute the raw bigint. Values that cannot be
 * represented exactly in binary (such as `"0.1"`) trigger the rounding
 * behaviour documented on {@link RoundingMode}, with `'strict'` throwing
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` by default.
 *
 * @example
 * ```ts
 * const audioSample = binaryFixedPoint('signed', 16, 15);
 * audioSample('0.5');          // raw === 16384n (exact)
 * audioSample('0.1');          // throws under the default 'strict' mode
 * audioSample('0.1', 'round'); // raw === 3277n
 * ```
 *
 * @see {@link BinaryFixedPoint}
 * @see {@link rawBinaryFixedPoint}
 * @see {@link ratioBinaryFixedPoint}
 */
export declare function binaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(signedness: TSignedness, totalBits: TTotalBits, fractionalBits: TFractionalBits): (input: string, rounding?: RoundingMode) => BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Returns a factory that constructs {@link BinaryFixedPoint} values from a
 * raw bigint in the smallest representable unit (i.e. already scaled by
 * `2 ** fractionalBits`).
 *
 * The outer call validates the shape parameters once and the returned
 * factory can be called many times to construct values of that shape.
 *
 * The raw value is range-checked against the claimed `totalBits` and
 * `signedness`; no rounding is ever required.
 *
 * @example
 * ```ts
 * const q1_15 = rawBinaryFixedPoint('signed', 16, 15);
 * q1_15(16384n); // Represents 0.5
 * ```
 *
 * @see {@link BinaryFixedPoint}
 * @see {@link binaryFixedPoint}
 * @see {@link ratioBinaryFixedPoint}
 */
export declare function rawBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(signedness: TSignedness, totalBits: TTotalBits, fractionalBits: TFractionalBits): (raw: bigint) => BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
/**
 * Returns a factory that constructs {@link BinaryFixedPoint} values from a
 * rational `numerator / denominator`.
 *
 * The outer call validates the shape parameters once and the returned
 * factory can be called many times to construct values of that shape.
 *
 * If the ratio cannot be exactly represented at the target
 * `fractionalBits`, the returned factory throws
 * `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` under the
 * default `'strict'` rounding mode. Pass a different {@link RoundingMode}
 * to allow a rounded result. Zero denominators always throw
 * `SOLANA_ERROR__FIXED_POINTS__INVALID_ZERO_DENOMINATOR_RATIO`.
 *
 * @example
 * ```ts
 * const probability = ratioBinaryFixedPoint('signed', 16, 15);
 * probability(1n, 4n);           // raw === 8192n (0.25, exact)
 * probability(1n, 3n);           // throws under 'strict'
 * probability(1n, 3n, 'floor');  // raw === 10922n
 * ```
 *
 * @see {@link BinaryFixedPoint}
 * @see {@link binaryFixedPoint}
 * @see {@link rawBinaryFixedPoint}
 */
export declare function ratioBinaryFixedPoint<TSignedness extends Signedness, TTotalBits extends number, TFractionalBits extends number>(signedness: TSignedness, totalBits: TTotalBits, fractionalBits: TFractionalBits): (numerator: bigint, denominator: bigint, rounding?: RoundingMode) => BinaryFixedPoint<TSignedness, TTotalBits, TFractionalBits>;
//# sourceMappingURL=core.d.ts.map