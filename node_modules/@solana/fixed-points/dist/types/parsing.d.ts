/**
 * Parses a human-readable decimal string into a decimal fixed-point
 * representation `{ raw, decimals }` such that the parsed value is exactly
 * `raw / 10 ** decimals`.
 *
 * Accepts strings of the form:
 * - `"123"`, `"-123"`
 * - `"12.5"`, `"-0.25"`
 * - `".5"`, `"-.5"`, `"5."`
 *
 * Rejects scientific notation, leading `+`, whitespace, and any other
 * non-digit / non-sign / non-decimal-point characters.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__INVALID_STRING` for malformed input.
 *
 * @internal
 */
export declare function parseDecimalString(kind: 'binaryFixedPoint' | 'decimalFixedPoint', input: string): {
    decimals: number;
    raw: bigint;
};
//# sourceMappingURL=parsing.d.ts.map