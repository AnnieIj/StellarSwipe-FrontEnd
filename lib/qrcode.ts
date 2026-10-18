/**
 * Minimal QR-code generator — no external dependencies.
 *
 * Generates a QR code bitmap for short ASCII strings (URI-safe pairing tokens)
 * and draws it onto an HTMLCanvasElement.
 *
 * Algorithm: QR Version 1–10, ECC level M, byte mode.
 * Based on the public-domain reference implementation by Project Nayuki
 * (https://www.nayuki.io/page/qr-code-generator-library), rewritten in
 * TypeScript for this project's needs.
 */

// ---------------------------------------------------------------------------
// GF(256) arithmetic for Reed-Solomon ECC
// ---------------------------------------------------------------------------
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  const result = new Uint8Array(degree + 1);
  result[degree] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++, root = GF_EXP[GF_LOG[root] + 1]) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root) ^ result[j + 1];
    }
    result[degree] = gfMul(result[degree], root);
  }
  return result;
}

function rsComputeRemainder(
  data: Uint8Array,
  generator: Uint8Array
): Uint8Array {
  const result = new Uint8Array(generator.length - 1);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let j = 0; j < result.length; j++) {
      result[j] ^= gfMul(generator[j], factor);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// QR version/ECC tables (Version 1–10, ECC level M)
// Each entry: [totalCodewords, ecCodewordsPerBlock, numBlocks]
// ---------------------------------------------------------------------------
interface VersionInfo {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  numBlocks: number;
  dataCodewords: number;
  alignmentPatterns: number[];
}

const VERSION_TABLE: VersionInfo[] = [
  // ver, total, ec/block, blocks,  data, alignment
  {
    version: 1,
    totalCodewords: 26,
    ecPerBlock: 10,
    numBlocks: 1,
    dataCodewords: 16,
    alignmentPatterns: [],
  },
  {
    version: 2,
    totalCodewords: 44,
    ecPerBlock: 16,
    numBlocks: 1,
    dataCodewords: 28,
    alignmentPatterns: [6, 18],
  },
  {
    version: 3,
    totalCodewords: 70,
    ecPerBlock: 26,
    numBlocks: 1,
    dataCodewords: 44,
    alignmentPatterns: [6, 22],
  },
  {
    version: 4,
    totalCodewords: 100,
    ecPerBlock: 18,
    numBlocks: 2,
    dataCodewords: 64,
    alignmentPatterns: [6, 26],
  },
  {
    version: 5,
    totalCodewords: 134,
    ecPerBlock: 24,
    numBlocks: 2,
    dataCodewords: 86,
    alignmentPatterns: [6, 30],
  },
  {
    version: 6,
    totalCodewords: 172,
    ecPerBlock: 16,
    numBlocks: 4,
    dataCodewords: 108,
    alignmentPatterns: [6, 34],
  },
  {
    version: 7,
    totalCodewords: 196,
    ecPerBlock: 18,
    numBlocks: 4,
    dataCodewords: 124,
    alignmentPatterns: [6, 22, 38],
  },
  {
    version: 8,
    totalCodewords: 242,
    ecPerBlock: 22,
    numBlocks: 4,
    dataCodewords: 154,
    alignmentPatterns: [6, 24, 42],
  },
  {
    version: 9,
    totalCodewords: 292,
    ecPerBlock: 22,
    numBlocks: 5,
    dataCodewords: 182,
    alignmentPatterns: [6, 26, 46],
  },
  {
    version: 10,
    totalCodewords: 346,
    ecPerBlock: 26,
    numBlocks: 5,
    dataCodewords: 216,
    alignmentPatterns: [6, 28, 50],
  },
];

function pickVersion(byteLen: number): VersionInfo {
  for (const v of VERSION_TABLE) {
    // byte mode overhead: 4 (mode) + 8 (char count) = 12 bits = 1.5 bytes
    if (v.dataCodewords >= byteLen + 2) return v;
  }
  throw new Error(
    `QR: data too long (${byteLen} bytes, max ~214 for version 10 M)`
  );
}

// ---------------------------------------------------------------------------
// Bit buffer
// ---------------------------------------------------------------------------
class BitBuffer {
  private data: number[] = [];
  private bitLen = 0;

  appendBits(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.data.push((value >> i) & 1);
    }
    this.bitLen += length;
  }

  getBytes(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bitLen / 8));
    for (let i = 0; i < this.bitLen; i++) {
      if (this.data[i]) bytes[i >> 3] |= 0x80 >> (i & 7);
    }
    return bytes;
  }

  get length() {
    return this.bitLen;
  }
}

// ---------------------------------------------------------------------------
// Build data codewords
// ---------------------------------------------------------------------------
function buildDataCodewords(text: string, info: VersionInfo): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const buf = new BitBuffer();
  // Byte mode indicator
  buf.appendBits(0b0100, 4);
  // Character count (8 bits for versions 1-9)
  buf.appendBits(bytes.length, 8);
  // Data bytes
  for (const b of bytes) buf.appendBits(b, 8);
  // Terminator
  const capacity = info.dataCodewords * 8;
  const termLen = Math.min(4, capacity - buf.length);
  if (termLen > 0) buf.appendBits(0, termLen);
  // Pad to byte boundary
  if (buf.length % 8 !== 0) buf.appendBits(0, 8 - (buf.length % 8));
  // Pad codewords
  const result = buf.getBytes();
  const padded = new Uint8Array(info.dataCodewords);
  padded.set(result.subarray(0, Math.min(result.length, info.dataCodewords)));
  const PAD = [0xec, 0x11];
  for (let i = result.length; i < info.dataCodewords; i++) {
    padded[i] = PAD[(i - result.length) & 1];
  }
  return padded;
}

// ---------------------------------------------------------------------------
// Interleave data + ECC blocks
// ---------------------------------------------------------------------------
function buildFinalMessage(
  dataCodewords: Uint8Array,
  info: VersionInfo
): Uint8Array {
  const blockSize = Math.floor(info.dataCodewords / info.numBlocks);
  const longBlocks = info.dataCodewords % info.numBlocks;
  const gen = rsGeneratorPoly(info.ecPerBlock);

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < info.numBlocks; i++) {
    const len = blockSize + (i >= info.numBlocks - longBlocks ? 1 : 0);
    const block = dataCodewords.subarray(offset, offset + len);
    dataBlocks.push(block);
    ecBlocks.push(rsComputeRemainder(block, gen));
    offset += len;
  }

  const out: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < info.ecPerBlock; i++) {
    for (const b of ecBlocks) out.push(b[i]);
  }
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// Matrix building
// ---------------------------------------------------------------------------
type Module = 0 | 1 | -1; // -1 = reserved/function module (dark=1, light=0)

function createMatrix(size: number): Module[][] {
  return Array.from(
    { length: size },
    () => new Array(size).fill(-1) as Module[]
  );
}

function setFinderPattern(mat: Module[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r,
        mc = col + c;
      if (mr < 0 || mr >= mat.length || mc < 0 || mc >= mat.length) continue;
      const dark =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      mat[mr][mc] = dark ? 1 : 0;
    }
  }
}

function setAlignmentPattern(mat: Module[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      mat[row + r][col + c] = dark ? 1 : 0;
    }
  }
}

function setTimingPatterns(mat: Module[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    const v: Module = (i & 1) === 0 ? 1 : 0;
    mat[6][i] = v;
    mat[i][6] = v;
  }
}

function reserveFormatArea(mat: Module[][], size: number) {
  // Reserve format info strips (written later after masking)
  for (let i = 0; i <= 8; i++) {
    if (mat[8][i] === -1) mat[8][i] = 0;
    if (mat[i][8] === -1) mat[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (mat[8][i] === -1) mat[8][i] = 0;
    if (mat[i][8] === -1) mat[i][8] = 0;
  }
  // Dark module
  mat[size - 8][8] = 1;
}

function placeDataBits(mat: Module[][], bits: boolean[]) {
  const size = mat.length;
  let bitIdx = 0;
  let goingUp = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    for (let vert = 0; vert < size; vert++) {
      const row = goingUp ? size - 1 - vert : vert;
      for (let col = right; col >= right - 1; col--) {
        if (mat[row][col] === -1) {
          mat[row][col] = bitIdx < bits.length && bits[bitIdx] ? 1 : 0;
          bitIdx++;
        }
      }
    }
    goingUp = !goingUp;
  }
}

function applyMask(mat: Module[][], mask: number): Module[][] {
  const size = mat.length;
  const result = mat.map((r) => [...r] as Module[]);
  const maskFn = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number, c: number) => r % 2 === 0,
    (_r: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ][mask];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Only flip data modules (value 0 or 1 that was placed, not reserved = -1)
      // After placeDataBits all -1 should be gone, but finder/timing are 0|1
      // We need to track which are function modules — simplest: re-check
      if (!isFunctionModule(mat, r, c, size)) {
        if (maskFn(r, c)) result[r][c] = result[r][c] === 1 ? 0 : 1;
      }
    }
  }
  return result;
}

// Rough function-module check: finder patterns, separators, timing, alignment
function isFunctionModule(
  mat: Module[][],
  row: number,
  col: number,
  size: number
): boolean {
  // Finder + separator regions
  if (row <= 8 && col <= 8) return true;
  if (row <= 8 && col >= size - 8) return true;
  if (row >= size - 8 && col <= 8) return true;
  // Timing strips
  if (row === 6 || col === 6) return true;
  return false;
}

function getFormatBits(eccLevel: number, mask: number): number {
  const data = (eccLevel << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  return bits;
}

function writeFormatModules(mat: Module[][], formatBits: number) {
  const size = mat.length;
  // Horizontal strip row 8
  const seq = [
    0,
    1,
    2,
    3,
    4,
    5,
    7,
    8,
    size - 8,
    size - 7,
    size - 6,
    size - 5,
    size - 4,
    size - 3,
    size - 2,
    size - 1,
  ];
  for (let i = 0; i < 15; i++) {
    const bit: Module = ((formatBits >> (14 - i)) & 1) as Module;
    if (i < 8) {
      mat[8][seq[i]] = bit;
      mat[seq[i + 8]][8] = bit; // vertical
    } else {
      mat[8][seq[i]] = bit;
    }
  }
  // Second copy (bottom-left / top-right)
  for (let i = 0; i < 7; i++) {
    mat[size - 1 - i][8] = ((formatBits >> i) & 1) as Module;
  }
  for (let i = 0; i < 8; i++) {
    mat[8][size - 8 + i] = ((formatBits >> (7 + i)) & 1) as Module;
  }
}

function penaltyScore(mat: Module[][]): number {
  const size = mat.length;
  let score = 0;
  // Rule 1: 5+ consecutive same-color
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (mat[r][c] === mat[r][c - 1]) {
        run++;
      } else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (mat[r][c] === mat[r - 1][c]) {
        run++;
      } else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = mat[r][c];
      if (v === mat[r + 1][c] && v === mat[r][c + 1] && v === mat[r + 1][c + 1])
        score += 3;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate a QR code and draw it onto `canvas`. */
export function renderQRCode(
  canvas: HTMLCanvasElement,
  text: string,
  options: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  } = {}
) {
  const {
    size = 256,
    margin = 4,
    darkColor = "#000000",
    lightColor = "#ffffff",
  } = options;

  const bytes = new TextEncoder().encode(text);
  const info = pickVersion(bytes.length);
  const dataCodewords = buildDataCodewords(text, info);
  const finalMsg = buildFinalMessage(dataCodewords, info);

  // Convert to bit array
  const bits: boolean[] = [];
  for (const byte of finalMsg) {
    for (let i = 7; i >= 0; i--) bits.push(((byte >> i) & 1) === 1);
  }

  const matSize = info.version * 4 + 17;

  // Build base matrix (function modules)
  const base = createMatrix(matSize);
  setFinderPattern(base, 0, 0);
  setFinderPattern(base, 0, matSize - 7);
  setFinderPattern(base, matSize - 7, 0);
  setTimingPatterns(base, matSize);
  for (const ap of info.alignmentPatterns) {
    for (const ap2 of info.alignmentPatterns) {
      if (
        (ap === 6 && ap2 === 6) ||
        (ap === 6 &&
          ap2 === info.alignmentPatterns[info.alignmentPatterns.length - 1]) ||
        (ap2 === 6 &&
          ap === info.alignmentPatterns[info.alignmentPatterns.length - 1])
      )
        continue;
      setAlignmentPattern(base, ap, ap2);
    }
  }
  reserveFormatArea(base, matSize);
  placeDataBits(base, bits);

  // Try all 8 masks, pick lowest penalty
  let bestMask = 0;
  let bestScore = Infinity;
  let bestMat = base;
  for (let m = 0; m < 8; m++) {
    const masked = applyMask(base, m);
    const fmt = getFormatBits(0b01 /* ECC M */, m);
    writeFormatModules(masked, fmt);
    const score = penaltyScore(masked);
    if (score < bestScore) {
      bestScore = score;
      bestMask = m;
      bestMat = masked;
    }
  }
  // Write final format bits
  const finalFmt = getFormatBits(0b01, bestMask);
  writeFormatModules(bestMat, finalFmt);

  // Draw
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const moduleSize = size / (matSize + margin * 2);

  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = darkColor;

  for (let r = 0; r < matSize; r++) {
    for (let c = 0; c < matSize; c++) {
      if (bestMat[r][c] === 1) {
        ctx.fillRect(
          Math.round((c + margin) * moduleSize),
          Math.round((r + margin) * moduleSize),
          Math.ceil(moduleSize),
          Math.ceil(moduleSize)
        );
      }
    }
  }
}
