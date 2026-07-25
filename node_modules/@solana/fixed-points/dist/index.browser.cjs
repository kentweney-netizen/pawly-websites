'use strict';

var errors = require('@solana/errors');
var codecsCore = require('@solana/codecs-core');

// src/assertions.ts
function getRawRange(signedness, totalBits) {
  if (signedness === "signed") {
    const half = 1n << BigInt(totalBits - 1);
    return { max: half - 1n, min: -half };
  }
  return { max: (1n << BigInt(totalBits)) - 1n, min: 0n };
}
function assertValidTotalBits(kind, totalBits) {
  if (typeof totalBits !== "number" || !Number.isInteger(totalBits) || totalBits <= 0) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_TOTAL_BITS, {
      kind,
      totalBits
    });
  }
}
function assertValidFractionalBits(fractionalBits) {
  if (typeof fractionalBits !== "number" || !Number.isInteger(fractionalBits) || fractionalBits < 0) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_FRACTIONAL_BITS, {
      fractionalBits
    });
  }
}
function assertValidDecimals(decimals) {
  if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_DECIMALS, {
      decimals
    });
  }
}
function assertFractionalBitsFitInTotalBits(fractionalBits, totalBits) {
  if (fractionalBits > totalBits) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__FRACTIONAL_BITS_EXCEED_TOTAL_BITS, {
      fractionalBits,
      totalBits
    });
  }
}
function assertTotalBitsIsByteAligned(kind, totalBits) {
  if (totalBits % 8 !== 0) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__TOTAL_BITS_NOT_BYTE_ALIGNED, {
      kind,
      totalBits
    });
  }
}
function assertRawFitsInRange(kind, signedness, totalBits, raw) {
  const { max, min } = getRawRange(signedness, totalBits);
  if (raw < min || raw > max) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__VALUE_OUT_OF_RANGE, {
      kind,
      max,
      min,
      raw,
      signedness,
      totalBits
    });
  }
}
function describeShape(value) {
  const record = value && typeof value === "object" ? value : {};
  const kind = typeof record.kind === "string" ? record.kind : "unknown";
  const signedness = typeof record.signedness === "string" ? record.signedness : "unknown";
  const totalBits = typeof record.totalBits === "number" ? record.totalBits : 0;
  let scale;
  let scaleLabel;
  if (kind === "decimalFixedPoint") {
    scale = typeof record.decimals === "number" ? record.decimals : 0;
    scaleLabel = "decimals";
  } else if (kind === "binaryFixedPoint") {
    scale = typeof record.fractionalBits === "number" ? record.fractionalBits : 0;
    scaleLabel = "fractional bits";
  } else {
    scale = 0;
    scaleLabel = "unknown";
  }
  return { kind, scale, scaleLabel, signedness, totalBits };
}
function assertShapeMatches(operation, actual, expected) {
  const actualIsStructurallyValid = (actual.signedness === "signed" || actual.signedness === "unsigned") && Number.isInteger(actual.totalBits) && actual.totalBits > 0 && Number.isInteger(actual.scale) && actual.scale >= 0;
  if (!actualIsStructurallyValid || actual.kind !== expected.kind || expected.signedness !== void 0 && actual.signedness !== expected.signedness || expected.totalBits !== void 0 && actual.totalBits !== expected.totalBits || expected.scale !== void 0 && actual.scale !== expected.scale) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__SHAPE_MISMATCH, {
      actualKind: actual.kind,
      actualScale: actual.scale,
      actualScaleLabel: actual.scaleLabel,
      actualSignedness: actual.signedness,
      actualTotalBits: actual.totalBits,
      expectedKind: expected.kind,
      expectedScale: expected.scale ?? actual.scale,
      expectedScaleLabel: expected.scaleLabel,
      expectedSignedness: expected.signedness ?? actual.signedness,
      expectedTotalBits: expected.totalBits ?? actual.totalBits,
      operation
    });
  }
}
function assertRawIsBigint(kind, value) {
  const raw = value && typeof value === "object" ? value.raw : void 0;
  if (typeof raw !== "bigint") {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__MALFORMED_RAW_VALUE, {
      kind,
      raw
    });
  }
}
function assertNoArithmeticOverflow(kind, operation, signedness, totalBits, result) {
  const { max, min } = getRawRange(signedness, totalBits);
  if (result < min || result > max) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__ARITHMETIC_OVERFLOW, {
      kind,
      max,
      min,
      operation,
      result,
      signedness,
      totalBits
    });
  }
}
function assertNoDivisionByZero(kind, signedness, totalBits, denominator) {
  if (denominator === 0n) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__DIVISION_BY_ZERO, {
      kind,
      signedness,
      totalBits
    });
  }
}
function roundDivision(kind, operation, numerator, denominator, mode) {
  const quotient = numerator / denominator;
  const remainder = numerator - quotient * denominator;
  if (remainder === 0n) {
    return quotient;
  }
  if (mode === "strict") {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__STRICT_MODE_PRECISION_LOSS, {
      kind,
      operation
    });
  }
  const sameSign = numerator < 0n === denominator < 0n;
  if (mode === "trunc") {
    return quotient;
  }
  if (mode === "floor") {
    return sameSign ? quotient : quotient - 1n;
  }
  if (mode === "ceil") {
    return sameSign ? quotient + 1n : quotient;
  }
  const absRemainderDoubled = (remainder < 0n ? -remainder : remainder) * 2n;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  if (absRemainderDoubled < absDenominator) {
    return quotient;
  }
  return sameSign ? quotient + 1n : quotient - 1n;
}

// src/binary/arithmetics.ts
function addBinaryFixedPoint(a, b) {
  assertShapeMatches("addBinaryFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.fractionalBits,
    scaleLabel: "fractional bits",
    signedness: a.signedness,
    totalBits: a.totalBits
  });
  const result = a.raw + b.raw;
  assertNoArithmeticOverflow(a.kind, "add", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function subtractBinaryFixedPoint(a, b) {
  assertShapeMatches("subtractBinaryFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.fractionalBits,
    scaleLabel: "fractional bits",
    signedness: a.signedness,
    totalBits: a.totalBits
  });
  const result = a.raw - b.raw;
  assertNoArithmeticOverflow(a.kind, "subtract", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function multiplyBinaryFixedPoint(a, b, rounding = "strict") {
  let result;
  if (typeof b === "bigint") {
    result = a.raw * b;
  } else {
    assertShapeMatches("multiplyBinaryFixedPoint", describeShape(b), {
      kind: a.kind,
      scaleLabel: "fractional bits",
      signedness: a.signedness
    });
    result = roundDivision(a.kind, "multiply", a.raw * b.raw, 1n << BigInt(b.fractionalBits), rounding);
  }
  assertNoArithmeticOverflow(a.kind, "multiply", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function divideBinaryFixedPoint(a, b, rounding = "strict") {
  let result;
  if (typeof b === "bigint") {
    assertNoDivisionByZero(a.kind, a.signedness, a.totalBits, b);
    result = roundDivision(a.kind, "divide", a.raw, b, rounding);
  } else {
    assertShapeMatches("divideBinaryFixedPoint", describeShape(b), {
      kind: a.kind,
      scaleLabel: "fractional bits",
      signedness: a.signedness
    });
    assertNoDivisionByZero(a.kind, a.signedness, a.totalBits, b.raw);
    result = roundDivision(a.kind, "divide", a.raw * (1n << BigInt(b.fractionalBits)), b.raw, rounding);
  }
  assertNoArithmeticOverflow(a.kind, "divide", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function negateBinaryFixedPoint(a) {
  assertShapeMatches("negateBinaryFixedPoint", describeShape(a), {
    kind: a.kind,
    scaleLabel: "fractional bits",
    signedness: "signed"
  });
  const result = -a.raw;
  assertNoArithmeticOverflow(a.kind, "negate", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function absoluteBinaryFixedPoint(a) {
  const result = a.raw < 0n ? -a.raw : a.raw;
  assertNoArithmeticOverflow(a.kind, "absolute", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
var MASK_64 = 0xffffffffffffffffn;
var MASK_32 = 0xffffffffn;
var MASK_16 = 0xffffn;
var MASK_8 = 0xffn;
function writeRawBigInt(bytes, offset, raw, byteSize, signedness, littleEndian) {
  const unsigned = signedness === "signed" && raw < 0n ? raw + (1n << BigInt(byteSize * 8)) : raw;
  const fullChunks = byteSize >> 3;
  const residual = byteSize & 7;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let c = 0; c < fullChunks; c++) {
    const chunk = unsigned >> BigInt(c * 64) & MASK_64;
    const position = littleEndian ? c * 8 : byteSize - (c + 1) * 8;
    view.setBigUint64(offset + position, chunk, littleEndian);
  }
  if (residual > 0) {
    const residualChunk = unsigned >> BigInt(fullChunks * 64);
    const residualBase = littleEndian ? fullChunks * 8 : 0;
    let consumed = 0;
    if (residual - consumed >= 4) {
      const chunk = Number(residualChunk >> BigInt(consumed * 8) & MASK_32);
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 4;
      view.setUint32(offset + position, chunk, littleEndian);
      consumed += 4;
    }
    if (residual - consumed >= 2) {
      const chunk = Number(residualChunk >> BigInt(consumed * 8) & MASK_16);
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 2;
      view.setUint16(offset + position, chunk, littleEndian);
      consumed += 2;
    }
    if (residual - consumed >= 1) {
      const chunk = Number(residualChunk >> BigInt(consumed * 8) & MASK_8);
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 1;
      bytes[offset + position] = chunk;
    }
  }
}
function readRawBigInt(bytes, offset, byteSize, signedness, littleEndian) {
  const fullChunks = byteSize >> 3;
  const residual = byteSize & 7;
  const view = new DataView(codecsCore.toArrayBuffer(bytes, offset, byteSize));
  let unsigned = 0n;
  for (let c = 0; c < fullChunks; c++) {
    const position = littleEndian ? c * 8 : byteSize - (c + 1) * 8;
    const chunk = view.getBigUint64(position, littleEndian);
    unsigned |= chunk << BigInt(c * 64);
  }
  if (residual > 0) {
    const residualBase = littleEndian ? fullChunks * 8 : 0;
    let residualChunk = 0n;
    let consumed = 0;
    if (residual - consumed >= 4) {
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 4;
      residualChunk |= BigInt(view.getUint32(position, littleEndian)) << BigInt(consumed * 8);
      consumed += 4;
    }
    if (residual - consumed >= 2) {
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 2;
      residualChunk |= BigInt(view.getUint16(position, littleEndian)) << BigInt(consumed * 8);
      consumed += 2;
    }
    if (residual - consumed >= 1) {
      const position = littleEndian ? residualBase + consumed : residualBase + residual - consumed - 1;
      residualChunk |= BigInt(bytes[offset + position]) << BigInt(consumed * 8);
    }
    unsigned |= residualChunk << BigInt(fullChunks * 64);
  }
  if (signedness === "signed") {
    const signBit = 1n << BigInt(byteSize * 8 - 1);
    if ((unsigned & signBit) !== 0n) {
      return unsigned - (1n << BigInt(byteSize * 8));
    }
  }
  return unsigned;
}

// src/binary/codecs.ts
function getBinaryFixedPointEncoder(signedness, totalBits, fractionalBits, config = {}) {
  assertValidTotalBits("binaryFixedPoint", totalBits);
  assertValidFractionalBits(fractionalBits);
  assertFractionalBitsFitInTotalBits(fractionalBits, totalBits);
  assertTotalBitsIsByteAligned("binaryFixedPoint", totalBits);
  const byteSize = totalBits / 8;
  const littleEndian = config.endian !== "be";
  return codecsCore.createEncoder({
    fixedSize: byteSize,
    write(value, bytes, offset) {
      assertShapeMatches("getBinaryFixedPointEncoder", describeShape(value), {
        kind: "binaryFixedPoint",
        scale: fractionalBits,
        scaleLabel: "fractional bits",
        signedness,
        totalBits
      });
      writeRawBigInt(bytes, offset, value.raw, byteSize, signedness, littleEndian);
      return offset + byteSize;
    }
  });
}
function getBinaryFixedPointDecoder(signedness, totalBits, fractionalBits, config = {}) {
  assertValidTotalBits("binaryFixedPoint", totalBits);
  assertValidFractionalBits(fractionalBits);
  assertFractionalBitsFitInTotalBits(fractionalBits, totalBits);
  assertTotalBitsIsByteAligned("binaryFixedPoint", totalBits);
  const byteSize = totalBits / 8;
  const littleEndian = config.endian !== "be";
  const codecDescription = "getBinaryFixedPointDecoder";
  return codecsCore.createDecoder({
    fixedSize: byteSize,
    read(bytes, offset) {
      codecsCore.assertByteArrayIsNotEmptyForCodec(codecDescription, bytes, offset);
      codecsCore.assertByteArrayHasEnoughBytesForCodec(codecDescription, byteSize, bytes, offset);
      const raw = readRawBigInt(bytes, offset, byteSize, signedness, littleEndian);
      const value = Object.freeze({
        fractionalBits,
        kind: "binaryFixedPoint",
        raw,
        signedness,
        totalBits
      });
      return [value, offset + byteSize];
    }
  });
}
function getBinaryFixedPointCodec(signedness, totalBits, fractionalBits, config = {}) {
  return codecsCore.combineCodec(
    getBinaryFixedPointEncoder(signedness, totalBits, fractionalBits, config),
    getBinaryFixedPointDecoder(signedness, totalBits, fractionalBits, config)
  );
}

// src/binary/comparisons.ts
function cmpBinaryFixedPoint(a, b) {
  assertShapeMatches("cmpBinaryFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.fractionalBits,
    scaleLabel: "fractional bits"
  });
  return a.raw < b.raw ? -1 : a.raw > b.raw ? 1 : 0;
}
function eqBinaryFixedPoint(a, b) {
  return cmpBinaryFixedPoint(a, b) === 0;
}
function ltBinaryFixedPoint(a, b) {
  return cmpBinaryFixedPoint(a, b) < 0;
}
function lteBinaryFixedPoint(a, b) {
  return cmpBinaryFixedPoint(a, b) <= 0;
}
function gtBinaryFixedPoint(a, b) {
  return cmpBinaryFixedPoint(a, b) > 0;
}
function gteBinaryFixedPoint(a, b) {
  return cmpBinaryFixedPoint(a, b) >= 0;
}

// src/binary/conversions.ts
function binaryFixedPointToBase10(value) {
  const decimals = value.fractionalBits;
  const raw = decimals === 0 ? value.raw : value.raw * 5n ** BigInt(decimals);
  return { decimals, raw };
}
function toUnsignedBinaryFixedPoint(value) {
  if (value.signedness === "unsigned") {
    return value;
  }
  assertRawFitsInRange("binaryFixedPoint", "unsigned", value.totalBits, value.raw);
  return Object.freeze({ ...value, signedness: "unsigned" });
}
function toSignedBinaryFixedPoint(value) {
  if (value.signedness === "signed") {
    return value;
  }
  assertRawFitsInRange("binaryFixedPoint", "signed", value.totalBits, value.raw);
  return Object.freeze({ ...value, signedness: "signed" });
}
function rescaleBinaryFixedPoint(value, newTotalBits, newFractionalBits, rounding = "strict") {
  assertValidTotalBits("binaryFixedPoint", newTotalBits);
  assertValidFractionalBits(newFractionalBits);
  assertFractionalBitsFitInTotalBits(newFractionalBits, newTotalBits);
  if (value.totalBits === newTotalBits && value.fractionalBits === newFractionalBits) {
    return value;
  }
  let result;
  if (newFractionalBits === value.fractionalBits) {
    result = value.raw;
  } else if (newFractionalBits > value.fractionalBits) {
    result = value.raw << BigInt(newFractionalBits - value.fractionalBits);
  } else {
    result = roundDivision(
      "binaryFixedPoint",
      "rescale",
      value.raw,
      1n << BigInt(value.fractionalBits - newFractionalBits),
      rounding
    );
  }
  assertNoArithmeticOverflow("binaryFixedPoint", "rescale", value.signedness, newTotalBits, result);
  return Object.freeze({ ...value, fractionalBits: newFractionalBits, raw: result, totalBits: newTotalBits });
}
function parseDecimalString(kind, input) {
  if (typeof input !== "string" || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(input)) {
    throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_STRING, {
      input: String(input),
      kind
    });
  }
  const isNegative = input.startsWith("-");
  const unsigned = isNegative ? input.slice(1) : input;
  const dotIndex = unsigned.indexOf(".");
  let integerPart;
  let fractionalPart;
  if (dotIndex === -1) {
    integerPart = unsigned;
    fractionalPart = "";
  } else {
    integerPart = unsigned.slice(0, dotIndex);
    fractionalPart = unsigned.slice(dotIndex + 1);
  }
  const digits = (integerPart || "0") + fractionalPart;
  const rawAbs = BigInt(digits);
  const raw = isNegative ? -rawAbs : rawAbs;
  return { decimals: fractionalPart.length, raw };
}

// src/binary/core.ts
function createBinaryFixedPoint(signedness, totalBits, fractionalBits, raw) {
  assertRawFitsInRange("binaryFixedPoint", signedness, totalBits, raw);
  return Object.freeze({ fractionalBits, kind: "binaryFixedPoint", raw, signedness, totalBits });
}
function binaryFixedPoint(signedness, totalBits, fractionalBits) {
  assertValidTotalBits("binaryFixedPoint", totalBits);
  assertValidFractionalBits(fractionalBits);
  assertFractionalBitsFitInTotalBits(fractionalBits, totalBits);
  return (input, rounding = "strict") => {
    const parsed = parseDecimalString("binaryFixedPoint", input);
    const scaledRaw = parsed.raw * (1n << BigInt(fractionalBits));
    const raw = parsed.decimals === 0 ? scaledRaw : roundDivision("binaryFixedPoint", "fromString", scaledRaw, 10n ** BigInt(parsed.decimals), rounding);
    return createBinaryFixedPoint(signedness, totalBits, fractionalBits, raw);
  };
}
function rawBinaryFixedPoint(signedness, totalBits, fractionalBits) {
  assertValidTotalBits("binaryFixedPoint", totalBits);
  assertValidFractionalBits(fractionalBits);
  assertFractionalBitsFitInTotalBits(fractionalBits, totalBits);
  return (raw) => createBinaryFixedPoint(signedness, totalBits, fractionalBits, raw);
}
function ratioBinaryFixedPoint(signedness, totalBits, fractionalBits) {
  assertValidTotalBits("binaryFixedPoint", totalBits);
  assertValidFractionalBits(fractionalBits);
  assertFractionalBitsFitInTotalBits(fractionalBits, totalBits);
  return (numerator, denominator, rounding = "strict") => {
    if (denominator === 0n) {
      throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_ZERO_DENOMINATOR_RATIO, {
        denominator,
        kind: "binaryFixedPoint",
        numerator
      });
    }
    const raw = roundDivision(
      "binaryFixedPoint",
      "fromRatio",
      numerator * (1n << BigInt(fractionalBits)),
      denominator,
      rounding
    );
    return createBinaryFixedPoint(signedness, totalBits, fractionalBits, raw);
  };
}

// src/formatting.ts
function applyDecimalsOption(kind, raw, currentDecimals, options) {
  const targetDecimals = options?.decimals;
  if (targetDecimals === void 0 || targetDecimals === currentDecimals) {
    return { decimals: currentDecimals, raw };
  }
  if (targetDecimals > currentDecimals) {
    return {
      decimals: targetDecimals,
      raw: raw * 10n ** BigInt(targetDecimals - currentDecimals)
    };
  }
  const divisor = 10n ** BigInt(currentDecimals - targetDecimals);
  const rescaled = roundDivision(kind, "toString", raw, divisor, options?.rounding ?? "strict");
  return { decimals: targetDecimals, raw: rescaled };
}
function formatScaledBigint(raw, decimals, padTrailingZeros) {
  if (decimals === 0) {
    return raw.toString();
  }
  const isNegative = raw < 0n;
  const absDigits = (isNegative ? -raw : raw).toString();
  const padded = absDigits.padStart(decimals + 1, "0");
  const integerPart = padded.slice(0, -decimals);
  let fractionalPart = padded.slice(-decimals);
  if (!padTrailingZeros) {
    fractionalPart = fractionalPart.replace(/0+$/, "");
  }
  const sign = isNegative ? "-" : "";
  if (fractionalPart.length === 0) {
    return `${sign}${integerPart}`;
  }
  return `${sign}${integerPart}.${fractionalPart}`;
}

// src/binary/formatting.ts
function binaryFixedPointToString(value, options) {
  const base10 = binaryFixedPointToBase10(value);
  const { decimals, raw } = applyDecimalsOption("binaryFixedPoint", base10.raw, base10.decimals, options);
  return formatScaledBigint(raw, decimals, options?.padTrailingZeros ?? false);
}
function formatBinaryFixedPoint(formatter, value) {
  const { decimals, raw } = binaryFixedPointToBase10(value);
  return formatter.format(`${raw}E-${decimals}`);
}
function binaryFixedPointToNumber(value) {
  const { fractionalBits, raw } = value;
  if (fractionalBits === 0) {
    return Number(raw);
  }
  const scale = 1n << BigInt(fractionalBits);
  const integerPart = raw / scale;
  const fractionalPart = Number(raw - integerPart * scale) / 2 ** fractionalBits;
  return Number(integerPart) + fractionalPart;
}

// src/binary/guards.ts
function assertIsBinaryFixedPoint(value, signedness, totalBits, fractionalBits) {
  const actual = describeShape(value);
  const expected = {
    kind: "binaryFixedPoint",
    scale: fractionalBits,
    scaleLabel: "fractional bits",
    signedness,
    totalBits
  };
  assertShapeMatches("assertIsBinaryFixedPoint", actual, expected);
  assertFractionalBitsFitInTotalBits(actual.scale, actual.totalBits);
  assertRawIsBigint("binaryFixedPoint", value);
  assertRawFitsInRange("binaryFixedPoint", actual.signedness, actual.totalBits, value.raw);
}
function isBinaryFixedPoint(value, signedness, totalBits, fractionalBits) {
  try {
    assertIsBinaryFixedPoint(value, signedness, totalBits, fractionalBits);
    return true;
  } catch {
    return false;
  }
}

// src/decimal/arithmetics.ts
function addDecimalFixedPoint(a, b) {
  assertShapeMatches("addDecimalFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.decimals,
    scaleLabel: "decimals",
    signedness: a.signedness,
    totalBits: a.totalBits
  });
  const result = a.raw + b.raw;
  assertNoArithmeticOverflow(a.kind, "add", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function subtractDecimalFixedPoint(a, b) {
  assertShapeMatches("subtractDecimalFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.decimals,
    scaleLabel: "decimals",
    signedness: a.signedness,
    totalBits: a.totalBits
  });
  const result = a.raw - b.raw;
  assertNoArithmeticOverflow(a.kind, "subtract", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function multiplyDecimalFixedPoint(a, b, rounding = "strict") {
  let result;
  if (typeof b === "bigint") {
    result = a.raw * b;
  } else {
    assertShapeMatches("multiplyDecimalFixedPoint", describeShape(b), {
      kind: a.kind,
      scaleLabel: "decimals",
      signedness: a.signedness
    });
    result = roundDivision(a.kind, "multiply", a.raw * b.raw, 10n ** BigInt(b.decimals), rounding);
  }
  assertNoArithmeticOverflow(a.kind, "multiply", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function divideDecimalFixedPoint(a, b, rounding = "strict") {
  let result;
  if (typeof b === "bigint") {
    assertNoDivisionByZero(a.kind, a.signedness, a.totalBits, b);
    result = roundDivision(a.kind, "divide", a.raw, b, rounding);
  } else {
    assertShapeMatches("divideDecimalFixedPoint", describeShape(b), {
      kind: a.kind,
      scaleLabel: "decimals",
      signedness: a.signedness
    });
    assertNoDivisionByZero(a.kind, a.signedness, a.totalBits, b.raw);
    result = roundDivision(a.kind, "divide", a.raw * 10n ** BigInt(b.decimals), b.raw, rounding);
  }
  assertNoArithmeticOverflow(a.kind, "divide", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function negateDecimalFixedPoint(a) {
  assertShapeMatches("negateDecimalFixedPoint", describeShape(a), {
    kind: a.kind,
    scaleLabel: "decimals",
    signedness: "signed"
  });
  const result = -a.raw;
  assertNoArithmeticOverflow(a.kind, "negate", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function absoluteDecimalFixedPoint(a) {
  const result = a.raw < 0n ? -a.raw : a.raw;
  assertNoArithmeticOverflow(a.kind, "absolute", a.signedness, a.totalBits, result);
  return Object.freeze({ ...a, raw: result });
}
function getDecimalFixedPointEncoder(signedness, totalBits, decimals, config = {}) {
  assertValidTotalBits("decimalFixedPoint", totalBits);
  assertValidDecimals(decimals);
  assertTotalBitsIsByteAligned("decimalFixedPoint", totalBits);
  const byteSize = totalBits / 8;
  const littleEndian = config.endian !== "be";
  return codecsCore.createEncoder({
    fixedSize: byteSize,
    write(value, bytes, offset) {
      assertShapeMatches("getDecimalFixedPointEncoder", describeShape(value), {
        kind: "decimalFixedPoint",
        scale: decimals,
        scaleLabel: "decimals",
        signedness,
        totalBits
      });
      writeRawBigInt(bytes, offset, value.raw, byteSize, signedness, littleEndian);
      return offset + byteSize;
    }
  });
}
function getDecimalFixedPointDecoder(signedness, totalBits, decimals, config = {}) {
  assertValidTotalBits("decimalFixedPoint", totalBits);
  assertValidDecimals(decimals);
  assertTotalBitsIsByteAligned("decimalFixedPoint", totalBits);
  const byteSize = totalBits / 8;
  const littleEndian = config.endian !== "be";
  const codecDescription = "getDecimalFixedPointDecoder";
  return codecsCore.createDecoder({
    fixedSize: byteSize,
    read(bytes, offset) {
      codecsCore.assertByteArrayIsNotEmptyForCodec(codecDescription, bytes, offset);
      codecsCore.assertByteArrayHasEnoughBytesForCodec(codecDescription, byteSize, bytes, offset);
      const raw = readRawBigInt(bytes, offset, byteSize, signedness, littleEndian);
      const value = Object.freeze({
        decimals,
        kind: "decimalFixedPoint",
        raw,
        signedness,
        totalBits
      });
      return [value, offset + byteSize];
    }
  });
}
function getDecimalFixedPointCodec(signedness, totalBits, decimals, config = {}) {
  return codecsCore.combineCodec(
    getDecimalFixedPointEncoder(signedness, totalBits, decimals, config),
    getDecimalFixedPointDecoder(signedness, totalBits, decimals, config)
  );
}

// src/decimal/comparisons.ts
function cmpDecimalFixedPoint(a, b) {
  assertShapeMatches("cmpDecimalFixedPoint", describeShape(b), {
    kind: a.kind,
    scale: a.decimals,
    scaleLabel: "decimals"
  });
  return a.raw < b.raw ? -1 : a.raw > b.raw ? 1 : 0;
}
function eqDecimalFixedPoint(a, b) {
  return cmpDecimalFixedPoint(a, b) === 0;
}
function ltDecimalFixedPoint(a, b) {
  return cmpDecimalFixedPoint(a, b) < 0;
}
function lteDecimalFixedPoint(a, b) {
  return cmpDecimalFixedPoint(a, b) <= 0;
}
function gtDecimalFixedPoint(a, b) {
  return cmpDecimalFixedPoint(a, b) > 0;
}
function gteDecimalFixedPoint(a, b) {
  return cmpDecimalFixedPoint(a, b) >= 0;
}

// src/decimal/conversions.ts
function toUnsignedDecimalFixedPoint(value) {
  if (value.signedness === "unsigned") {
    return value;
  }
  assertRawFitsInRange("decimalFixedPoint", "unsigned", value.totalBits, value.raw);
  return Object.freeze({ ...value, signedness: "unsigned" });
}
function toSignedDecimalFixedPoint(value) {
  if (value.signedness === "signed") {
    return value;
  }
  assertRawFitsInRange("decimalFixedPoint", "signed", value.totalBits, value.raw);
  return Object.freeze({ ...value, signedness: "signed" });
}
function rescaleDecimalFixedPoint(value, newTotalBits, newDecimals, rounding = "strict") {
  assertValidTotalBits("decimalFixedPoint", newTotalBits);
  assertValidDecimals(newDecimals);
  if (value.totalBits === newTotalBits && value.decimals === newDecimals) {
    return value;
  }
  let result;
  if (newDecimals === value.decimals) {
    result = value.raw;
  } else if (newDecimals > value.decimals) {
    result = value.raw * 10n ** BigInt(newDecimals - value.decimals);
  } else {
    result = roundDivision(
      "decimalFixedPoint",
      "rescale",
      value.raw,
      10n ** BigInt(value.decimals - newDecimals),
      rounding
    );
  }
  assertNoArithmeticOverflow("decimalFixedPoint", "rescale", value.signedness, newTotalBits, result);
  return Object.freeze({ ...value, decimals: newDecimals, raw: result, totalBits: newTotalBits });
}
function createDecimalFixedPoint(signedness, totalBits, decimals, raw) {
  assertRawFitsInRange("decimalFixedPoint", signedness, totalBits, raw);
  return Object.freeze({ decimals, kind: "decimalFixedPoint", raw, signedness, totalBits });
}
function decimalFixedPoint(signedness, totalBits, decimals) {
  assertValidTotalBits("decimalFixedPoint", totalBits);
  assertValidDecimals(decimals);
  return (input, rounding = "strict") => {
    const parsed = parseDecimalString("decimalFixedPoint", input);
    const raw = parsed.decimals <= decimals ? parsed.raw * 10n ** BigInt(decimals - parsed.decimals) : roundDivision(
      "decimalFixedPoint",
      "fromString",
      parsed.raw,
      10n ** BigInt(parsed.decimals - decimals),
      rounding
    );
    return createDecimalFixedPoint(signedness, totalBits, decimals, raw);
  };
}
function rawDecimalFixedPoint(signedness, totalBits, decimals) {
  assertValidTotalBits("decimalFixedPoint", totalBits);
  assertValidDecimals(decimals);
  return (raw) => createDecimalFixedPoint(signedness, totalBits, decimals, raw);
}
function ratioDecimalFixedPoint(signedness, totalBits, decimals) {
  assertValidTotalBits("decimalFixedPoint", totalBits);
  assertValidDecimals(decimals);
  return (numerator, denominator, rounding = "strict") => {
    if (denominator === 0n) {
      throw new errors.SolanaError(errors.SOLANA_ERROR__FIXED_POINTS__INVALID_ZERO_DENOMINATOR_RATIO, {
        denominator,
        kind: "decimalFixedPoint",
        numerator
      });
    }
    const raw = roundDivision(
      "decimalFixedPoint",
      "fromRatio",
      numerator * 10n ** BigInt(decimals),
      denominator,
      rounding
    );
    return createDecimalFixedPoint(signedness, totalBits, decimals, raw);
  };
}

// src/decimal/formatting.ts
function decimalFixedPointToString(value, options) {
  const { decimals, raw } = applyDecimalsOption("decimalFixedPoint", value.raw, value.decimals, options);
  return formatScaledBigint(raw, decimals, options?.padTrailingZeros ?? false);
}
function formatDecimalFixedPoint(formatter, value) {
  return formatter.format(`${value.raw}E-${value.decimals}`);
}
function decimalFixedPointToNumber(value) {
  return Number(value.raw) / 10 ** value.decimals;
}

// src/decimal/guards.ts
function assertIsDecimalFixedPoint(value, signedness, totalBits, decimals) {
  const actual = describeShape(value);
  const expected = {
    kind: "decimalFixedPoint",
    scale: decimals,
    scaleLabel: "decimals",
    signedness,
    totalBits
  };
  assertShapeMatches("assertIsDecimalFixedPoint", actual, expected);
  assertRawIsBigint("decimalFixedPoint", value);
  assertRawFitsInRange("decimalFixedPoint", actual.signedness, actual.totalBits, value.raw);
}
function isDecimalFixedPoint(value, signedness, totalBits, decimals) {
  try {
    assertIsDecimalFixedPoint(value, signedness, totalBits, decimals);
    return true;
  } catch {
    return false;
  }
}

exports.absoluteBinaryFixedPoint = absoluteBinaryFixedPoint;
exports.absoluteDecimalFixedPoint = absoluteDecimalFixedPoint;
exports.addBinaryFixedPoint = addBinaryFixedPoint;
exports.addDecimalFixedPoint = addDecimalFixedPoint;
exports.assertIsBinaryFixedPoint = assertIsBinaryFixedPoint;
exports.assertIsDecimalFixedPoint = assertIsDecimalFixedPoint;
exports.binaryFixedPoint = binaryFixedPoint;
exports.binaryFixedPointToBase10 = binaryFixedPointToBase10;
exports.binaryFixedPointToNumber = binaryFixedPointToNumber;
exports.binaryFixedPointToString = binaryFixedPointToString;
exports.cmpBinaryFixedPoint = cmpBinaryFixedPoint;
exports.cmpDecimalFixedPoint = cmpDecimalFixedPoint;
exports.decimalFixedPoint = decimalFixedPoint;
exports.decimalFixedPointToNumber = decimalFixedPointToNumber;
exports.decimalFixedPointToString = decimalFixedPointToString;
exports.divideBinaryFixedPoint = divideBinaryFixedPoint;
exports.divideDecimalFixedPoint = divideDecimalFixedPoint;
exports.eqBinaryFixedPoint = eqBinaryFixedPoint;
exports.eqDecimalFixedPoint = eqDecimalFixedPoint;
exports.formatBinaryFixedPoint = formatBinaryFixedPoint;
exports.formatDecimalFixedPoint = formatDecimalFixedPoint;
exports.getBinaryFixedPointCodec = getBinaryFixedPointCodec;
exports.getBinaryFixedPointDecoder = getBinaryFixedPointDecoder;
exports.getBinaryFixedPointEncoder = getBinaryFixedPointEncoder;
exports.getDecimalFixedPointCodec = getDecimalFixedPointCodec;
exports.getDecimalFixedPointDecoder = getDecimalFixedPointDecoder;
exports.getDecimalFixedPointEncoder = getDecimalFixedPointEncoder;
exports.gtBinaryFixedPoint = gtBinaryFixedPoint;
exports.gtDecimalFixedPoint = gtDecimalFixedPoint;
exports.gteBinaryFixedPoint = gteBinaryFixedPoint;
exports.gteDecimalFixedPoint = gteDecimalFixedPoint;
exports.isBinaryFixedPoint = isBinaryFixedPoint;
exports.isDecimalFixedPoint = isDecimalFixedPoint;
exports.ltBinaryFixedPoint = ltBinaryFixedPoint;
exports.ltDecimalFixedPoint = ltDecimalFixedPoint;
exports.lteBinaryFixedPoint = lteBinaryFixedPoint;
exports.lteDecimalFixedPoint = lteDecimalFixedPoint;
exports.multiplyBinaryFixedPoint = multiplyBinaryFixedPoint;
exports.multiplyDecimalFixedPoint = multiplyDecimalFixedPoint;
exports.negateBinaryFixedPoint = negateBinaryFixedPoint;
exports.negateDecimalFixedPoint = negateDecimalFixedPoint;
exports.ratioBinaryFixedPoint = ratioBinaryFixedPoint;
exports.ratioDecimalFixedPoint = ratioDecimalFixedPoint;
exports.rawBinaryFixedPoint = rawBinaryFixedPoint;
exports.rawDecimalFixedPoint = rawDecimalFixedPoint;
exports.rescaleBinaryFixedPoint = rescaleBinaryFixedPoint;
exports.rescaleDecimalFixedPoint = rescaleDecimalFixedPoint;
exports.subtractBinaryFixedPoint = subtractBinaryFixedPoint;
exports.subtractDecimalFixedPoint = subtractDecimalFixedPoint;
exports.toSignedBinaryFixedPoint = toSignedBinaryFixedPoint;
exports.toSignedDecimalFixedPoint = toSignedDecimalFixedPoint;
exports.toUnsignedBinaryFixedPoint = toUnsignedBinaryFixedPoint;
exports.toUnsignedDecimalFixedPoint = toUnsignedDecimalFixedPoint;
//# sourceMappingURL=index.browser.cjs.map
//# sourceMappingURL=index.browser.cjs.map