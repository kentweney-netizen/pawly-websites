import { type ReadonlyUint8Array } from '@solana/codecs-core';
import type { Signedness } from './signedness';
/**
 * Configuration options for fixed-point codecs.
 */
export type FixedPointCodecConfig = {
    /**
     * Whether values are serialized in little- or big-endian byte order.
     *
     * @defaultValue `'le'`
     */
    endian?: 'be' | 'le';
};
/**
 * Maps a byte-aligned `totalBits` literal to its byte count. Falls back to
 * `number` when `totalBits` is not a known multiple of 8 between 8 and 256
 * inclusive — in which case the runtime still works, but the literal size
 * generic is erased.
 *
 * @internal
 */
type TotalBitsToBytesTable = {
    8: 1;
    16: 2;
    24: 3;
    32: 4;
    40: 5;
    48: 6;
    56: 7;
    64: 8;
    72: 9;
    80: 10;
    88: 11;
    96: 12;
    104: 13;
    112: 14;
    120: 15;
    128: 16;
    136: 17;
    144: 18;
    152: 19;
    160: 20;
    168: 21;
    176: 22;
    184: 23;
    192: 24;
    200: 25;
    208: 26;
    216: 27;
    224: 28;
    232: 29;
    240: 30;
    248: 31;
    256: 32;
};
/**
 * Byte count implied by a fixed-point codec's `totalBits`. Preserves the
 * byte-size literal in the codec type for common widths (multiples of 8
 * from 8 to 256); widens to `number` for other widths.
 *
 * @internal
 */
export type BytesForTotalBits<TTotalBits extends number> = TTotalBits extends keyof TotalBitsToBytesTable ? TotalBitsToBytesTable[TTotalBits] : number;
/**
 * Writes a raw bigint into `bytes` starting at `offset`, using `byteSize`
 * bytes with the given `signedness` and endianness.
 *
 * Signed negative values are serialized using two's-complement semantics:
 * `raw + 2 ** (byteSize * 8)` is written as if unsigned. The caller is
 * expected to have validated that `raw` fits the claimed range.
 *
 * The implementation processes 64-bit chunks via `DataView.setBigUint64`
 * and greedily consumes the remaining 0–7 bytes with at most one
 * `setUint32`, one `setUint16`, and one direct byte write. For common
 * widths this matches `@solana/codecs-numbers` performance exactly.
 *
 * @internal
 */
export declare function writeRawBigInt(bytes: Uint8Array, offset: number, raw: bigint, byteSize: number, signedness: Signedness, littleEndian: boolean): void;
/**
 * Reads a raw bigint from `bytes` starting at `offset`, using `byteSize`
 * bytes with the given `signedness` and endianness.
 *
 * Signed values use two's-complement semantics: if the top bit of the
 * decoded unsigned value is set, `2 ** (byteSize * 8)` is subtracted to
 * produce the negative result.
 *
 * The implementation processes 64-bit chunks via `DataView.getBigUint64`
 * and greedily consumes the remaining 0–7 bytes with at most one
 * `getUint32`, one `getUint16`, and one direct byte read.
 *
 * @internal
 */
export declare function readRawBigInt(bytes: ReadonlyUint8Array | Uint8Array, offset: number, byteSize: number, signedness: Signedness, littleEndian: boolean): bigint;
export {};
//# sourceMappingURL=codecs.d.ts.map