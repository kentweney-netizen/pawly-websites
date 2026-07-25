import { type FixedSizeCodec, type FixedSizeDecoder, type FixedSizeEncoder } from '@solana/codecs-core';
import { type BytesForTotalBits, type FixedPointCodecConfig } from '../codecs';
import type { Signedness } from '../signedness';
import type { DecimalFixedPoint } from './core';
/**
 * Returns an encoder for {@link DecimalFixedPoint} values of a specific
 * shape. The encoder serializes `value.raw` as a fixed-size integer using
 * two's-complement for signed values and little-endian byte order by
 * default.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__TOTAL_BITS_NOT_BYTE_ALIGNED` when
 * `totalBits` is not a multiple of 8. Encoding a value whose shape does
 * not match the codec's shape throws
 * `SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH`.
 *
 * @example
 * ```ts
 * const encoder = getDecimalFixedPointEncoder('unsigned', 64, 6);
 * encoder.encode(decimalFixedPoint('unsigned', 64, 6)('42.5'));
 * ```
 *
 * @see {@link getDecimalFixedPointDecoder}
 * @see {@link getDecimalFixedPointCodec}
 */
export declare function getDecimalFixedPointEncoder<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(signedness: TSignedness, totalBits: TTotalBits, decimals: TDecimals, config?: FixedPointCodecConfig): FixedSizeEncoder<DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, BytesForTotalBits<TTotalBits>>;
/**
 * Returns a decoder for {@link DecimalFixedPoint} values of a specific
 * shape. The decoder reads a fixed-size integer using two's-complement for
 * signed values and little-endian byte order by default, and reconstructs
 * a frozen {@link DecimalFixedPoint} from the bytes.
 *
 * Throws `SOLANA_ERROR__FIXED_POINTS__TOTAL_BITS_NOT_BYTE_ALIGNED` when
 * `totalBits` is not a multiple of 8.
 *
 * @example
 * ```ts
 * const decoder = getDecimalFixedPointDecoder('unsigned', 64, 6);
 * decoder.decode(bytes); // represents 42.5 for appropriately encoded bytes
 * ```
 *
 * @see {@link getDecimalFixedPointEncoder}
 * @see {@link getDecimalFixedPointCodec}
 */
export declare function getDecimalFixedPointDecoder<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(signedness: TSignedness, totalBits: TTotalBits, decimals: TDecimals, config?: FixedPointCodecConfig): FixedSizeDecoder<DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, BytesForTotalBits<TTotalBits>>;
/**
 * Returns a codec for {@link DecimalFixedPoint} values of a specific
 * shape, combining {@link getDecimalFixedPointEncoder} and
 * {@link getDecimalFixedPointDecoder}.
 *
 * @example
 * ```ts
 * const codec = getDecimalFixedPointCodec('unsigned', 64, 6);
 * const bytes = codec.encode(decimalFixedPoint('unsigned', 64, 6)('42.5'));
 * const value = codec.decode(bytes); // represents 42.5
 * ```
 *
 * @see {@link getDecimalFixedPointEncoder}
 * @see {@link getDecimalFixedPointDecoder}
 */
export declare function getDecimalFixedPointCodec<TSignedness extends Signedness, TTotalBits extends number, TDecimals extends number>(signedness: TSignedness, totalBits: TTotalBits, decimals: TDecimals, config?: FixedPointCodecConfig): FixedSizeCodec<DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, DecimalFixedPoint<TSignedness, TTotalBits, TDecimals>, BytesForTotalBits<TTotalBits>>;
//# sourceMappingURL=codecs.d.ts.map