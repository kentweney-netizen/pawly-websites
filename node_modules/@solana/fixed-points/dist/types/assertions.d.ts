import type { Signedness } from './signedness';
type FixedPointKind = 'binaryFixedPoint' | 'decimalFixedPoint';
/**
 * Returns the inclusive raw bigint range for a fixed-point number with the
 * given signedness and total bits.
 *
 * Signed ranges use two's-complement semantics, so an 8-bit signed value
 * spans `[-128n, 127n]` and an 8-bit unsigned value spans `[0n, 255n]`.
 *
 * This helper trusts that `totalBits` has already been validated as a
 * positive integer by the caller.
 *
 * @internal
 */
export declare function getRawRange(signedness: Signedness, totalBits: number): {
    max: bigint;
    min: bigint;
};
/**
 * Asserts that `totalBits` is a positive integer. Throws
 * `SOLANA_ERROR__FIXED_POINTS__INVALID_TOTAL_BITS` otherwise.
 *
 * @internal
 */
export declare function assertValidTotalBits(kind: FixedPointKind, totalBits: unknown): asserts totalBits is number;
/**
 * Asserts that `fractionalBits` is a non-negative integer. Throws
 * `SOLANA_ERROR__FIXED_POINTS__INVALID_FRACTIONAL_BITS` otherwise.
 *
 * @internal
 */
export declare function assertValidFractionalBits(fractionalBits: unknown): asserts fractionalBits is number;
/**
 * Asserts that `decimals` is a non-negative integer. Throws
 * `SOLANA_ERROR__FIXED_POINTS__INVALID_DECIMALS` otherwise.
 *
 * @internal
 */
export declare function assertValidDecimals(decimals: unknown): asserts decimals is number;
/**
 * Asserts that `fractionalBits` does not exceed `totalBits` for a binary
 * fixed-point shape. Throws
 * `SOLANA_ERROR__FIXED_POINTS__FRACTIONAL_BITS_EXCEED_TOTAL_BITS` otherwise.
 *
 * @internal
 */
export declare function assertFractionalBitsFitInTotalBits(fractionalBits: number, totalBits: number): void;
/**
 * Asserts that `totalBits` is a multiple of 8. Throws
 * `SOLANA_ERROR__FIXED_POINTS__TOTAL_BITS_NOT_BYTE_ALIGNED` otherwise.
 *
 * This is a codec-only constraint: fixed-point values themselves accept
 * any positive `totalBits`, but the byte-oriented codec can only serialize
 * sizes that are exact multiples of 8 bits.
 *
 * @internal
 */
export declare function assertTotalBitsIsByteAligned(kind: FixedPointKind, totalBits: number): void;
/**
 * Asserts that a raw bigint fits the range claimed by the given signedness
 * and total bits. Throws `SOLANA_ERROR__FIXED_POINTS__VALUE_OUT_OF_RANGE`
 * otherwise.
 *
 * @internal
 */
export declare function assertRawFitsInRange(kind: FixedPointKind, signedness: Signedness, totalBits: number, raw: bigint): void;
/**
 * Describes the concrete shape of a fixed-point value for `SHAPE_MISMATCH`
 * error context. The `scale` is `fractionalBits` for binary values and
 * `decimals` for decimal values; `scaleLabel` is the matching
 * human-readable label.
 *
 * @internal
 */
export type FixedPointShape = {
    kind: string;
    scale: number;
    scaleLabel: string;
    signedness: string;
    totalBits: number;
};
/**
 * Expected shape for {@link assertShapeMatches}. Each field except `kind`
 * and `scaleLabel` is optional: `undefined` means "don't constrain this
 * field". `kind` is always required because mismatched kinds are always
 * mismatches; `scaleLabel` is always required because it appears in the
 * expected side of the error message even when `scale` is not pinned.
 *
 * @internal
 */
export type ExpectedFixedPointShape = {
    kind: string;
    scale?: number;
    scaleLabel: string;
    signedness?: string;
    totalBits?: number;
};
/**
 * Best-effort {@link FixedPointShape} description for an unknown value.
 * Used to populate the `actual*` half of `SHAPE_MISMATCH` contexts when
 * the input may not be a valid fixed-point value at all.
 *
 * @internal
 */
export declare function describeShape(value: unknown): FixedPointShape;
/**
 * Asserts that `actual` matches the `expected` shape. Throws
 * `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH` otherwise.
 *
 * Fields left `undefined` on `expected` are not constrained — the actual
 * value may carry any value for that field. This is how partial shape
 * checks (e.g. "any signed value" without pinning `totalBits`) are
 * expressed.
 *
 * @internal
 */
export declare function assertShapeMatches(operation: string, actual: FixedPointShape, expected: ExpectedFixedPointShape): void;
/**
 * Asserts that `value.raw` is a bigint, so that downstream range checks
 * can compare it against the claimed signedness and total bits. Throws
 * `SOLANA_ERROR__FIXED_POINTS__MALFORMED_RAW_VALUE` otherwise.
 *
 * @internal
 */
export declare function assertRawIsBigint(kind: FixedPointKind, value: unknown): asserts value is {
    raw: bigint;
};
/**
 * Asserts that a bigint `result` produced by an arithmetic operation fits
 * the range claimed by the given signedness and total bits. Throws
 * `SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW` otherwise, carrying
 * the operation name so the error message can identify which op overflowed.
 *
 * @internal
 */
export declare function assertNoArithmeticOverflow(kind: FixedPointKind, operation: string, signedness: Signedness, totalBits: number, result: bigint): void;
/**
 * Asserts that a divisor is non-zero. Throws
 * `SOLANA_ERROR__FIXED_POINTS__DIVISION_BY_ZERO` otherwise.
 *
 * @internal
 */
export declare function assertNoDivisionByZero(kind: FixedPointKind, signedness: Signedness, totalBits: number, denominator: bigint): void;
export {};
//# sourceMappingURL=assertions.d.ts.map