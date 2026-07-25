import { type RoundingMode } from './rounding';
/**
 * Options accepted by `binaryFixedPointToString` and
 * `decimalFixedPointToString` to control the emitted representation.
 *
 * - `decimals`: caps the number of fractional digits in the output. When
 *   this is lower than the value's native precision the raw value is
 *   rescaled using `rounding` (defaults to `'strict'`, which throws
 *   `SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS` on inexact
 *   results). When higher, the extra precision is zero-padded only if
 *   `padTrailingZeros` is also set.
 * - `padTrailingZeros`: emits exactly as many fractional digits as
 *   requested by `decimals`. When `decimals` is omitted, pads to the
 *   value's native scale (`decimals` for decimal values,
 *   `fractionalBits` for binary values — the length of the exact
 *   base-10 expansion). Defaults to `false`, which trims trailing zeros
 *   (and drops the decimal point altogether for whole numbers).
 * - `rounding`: only consulted when `decimals` forces a scale-down.
 *   Defaults to `'strict'`.
 */
export type FixedPointToStringOptions = {
    decimals?: number;
    padTrailingZeros?: boolean;
    rounding?: RoundingMode;
};
/**
 * Rescales `raw` from `currentDecimals` decimal digits to `options.decimals`
 * decimal digits (when set), respecting `options.rounding`. Returns the
 * raw value to format and the number of fractional digits implied by it.
 *
 * @internal
 */
export declare function applyDecimalsOption(kind: 'binaryFixedPoint' | 'decimalFixedPoint', raw: bigint, currentDecimals: number, options: FixedPointToStringOptions | undefined): {
    decimals: number;
    raw: bigint;
};
/**
 * Formats a scaled bigint `(raw, decimals)` as a canonical decimal
 * string. When `padTrailingZeros` is `true`, the output emits exactly
 * `decimals` fractional digits; otherwise trailing zeros are trimmed and
 * the decimal point is dropped if the fractional part becomes empty.
 *
 * @internal
 */
export declare function formatScaledBigint(raw: bigint, decimals: number, padTrailingZeros: boolean): string;
//# sourceMappingURL=formatting.d.ts.map