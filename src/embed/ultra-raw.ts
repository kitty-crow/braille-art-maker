import type { Art, ArtCfg, CellColour, Rgb } from "../types.ts";
import type { PackedEmbed } from "./raw.ts";

export interface UltraCandidate {
  readonly bytes: Uint8Array;
  readonly mask: string;
  readonly colour: string;
}

const MAGIC_A = 0x55;
const MAGIC_B = 0x34;
const VERSION = 1;
const FG = 1;
const BG = 2;
const FULL = 4;

const MASK_DIRECT = 0;
const MASK_LEFT_XOR = 1;
const MASK_UP_XOR = 2;
const MASK_PAETH_XOR = 3;
const MASK_LEFT_DELTA = 4;
const MASK_UP_DELTA = 5;
const MASK_BITS = 6;
const MASK_BITS_LEFT = 7;
const MASK_BITS_UP = 8;

const COLOUR_NONE = 0;
const COLOUR_PAIR = 1;
const COLOUR_PALETTE = 2;
const COLOUR_PALETTE_RGB = 3;
const COLOUR_DELTA_LEFT = 4;
const COLOUR_DELTA_UP = 5;
const COLOUR_DELTA_PAETH = 6;
const COLOUR_YCOCG_LEFT = 7;
const COLOUR_YCOCG_UP = 8;
const COLOUR_YCOCG_PAETH = 9;

const maskModes = [
  { id: MASK_DIRECT, name: "direct" },
  { id: MASK_LEFT_XOR, name: "xor-left" },
  { id: MASK_UP_XOR, name: "xor-up" },
  { id: MASK_PAETH_XOR, name: "xor-paeth" },
  { id: MASK_LEFT_DELTA, name: "delta-left" },
  { id: MASK_UP_DELTA, name: "delta-up" },
  { id: MASK_BITS, name: "bits" },
  { id: MASK_BITS_LEFT, name: "bits-xor-left" },
  { id: MASK_BITS_UP, name: "bits-xor-up" },
] as const;

const colourModes = [
  { id: COLOUR_PAIR, name: "pair-palette" },
  { id: COLOUR_PALETTE, name: "palette-frequency" },
  { id: COLOUR_PALETTE_RGB, name: "palette-rgb" },
  { id: COLOUR_DELTA_LEFT, name: "rgb-left" },
  { id: COLOUR_DELTA_UP, name: "rgb-up" },
  { id: COLOUR_DELTA_PAETH, name: "rgb-paeth" },
  { id: COLOUR_YCOCG_LEFT, name: "ycocg-left" },
  { id: COLOUR_YCOCG_UP, name: "ycocg-up" },
  { id: COLOUR_YCOCG_PAETH, name: "ycocg-paeth" },
] as const;

class Reader {
  private at = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get done(): boolean { return this.at === this.bytes.length; }

  byte(): number {
    const value = this.bytes[this.at++];
    if (value === undefined) throw new Error("Packed Unicode ultra payload ended unexpectedly.");
    return value;
  }

  bytesOf(length: number): Uint8Array {
    if (length < 0 || this.at + length > this.bytes.length) throw new Error("Packed Unicode ultra payload ended unexpectedly.");
    const value = this.bytes.subarray(this.at, this.at + length);
    this.at += length;
    return value;
  }

  varint(): number {
    let value = 0;
    let shift = 0;
    while (shift <= 28) {
      const byte = this.byte();
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return value >>> 0;
      shift += 7;
    }
    throw new Error("Packed Unicode ultra payload contains an invalid integer.");
  }
}

class Bits {
  private readonly out: number[] = [];
  private byte = 0;
  private used = 0;

  write(value: number, width: number): void {
    for (let bit = 0; bit < width; bit += 1) {
      if ((value & (1 << bit)) !== 0) this.byte |= 1 << this.used;
      this.used += 1;
      if (this.used !== 8) continue;
      this.out.push(this.byte);
      this.byte = 0;
      this.used = 0;
    }
  }

  finish(): Uint8Array {
    if (this.used) this.out.push(this.byte);
    return Uint8Array.from(this.out);
  }
}

const readBits = (bytes: Uint8Array, index: number, width: number): number => {
  let value = 0;
  const first = index * width;
  for (let bit = 0; bit < width; bit += 1) {
    const at = first + bit;
    if ((bytes[at >> 3]! & (1 << (at & 7))) !== 0) value |= 1 << bit;
  }
  return value >>> 0;
};

const putVar = (out: number[], value: number): void => {
  let n = value >>> 0;
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
};

const zig = (value: number): number => value >= 0 ? value * 2 : -value * 2 - 1;
const unzig = (value: number): number => (value & 1) ? -((value + 1) >> 1) : value >> 1;
const bitsFor = (count: number): number => count <= 1 ? 0 : Math.ceil(Math.log2(count));
const keyOf = (rgb: Rgb): number => (rgb.r << 16) | (rgb.g << 8) | rgb.b;
const rgbOf = (key: number): Rgb => ({ r: (key >>> 16) & 0xff, g: (key >>> 8) & 0xff, b: key & 0xff });
const cellRgb = (cell: CellColour | undefined, background: boolean): Rgb | undefined => background ? cell?.bg : cell?.fg;

const flagsFor = (cfg: ArtCfg): number => {
  const colour = cfg.colour === true;
  const background = colour && cfg.colourBackground === true;
  const full = background && cfg.fullColour === true;
  return (colour ? FG : 0) | (background ? BG : 0) | (full ? FULL : 0);
};

const readFlags = (flags: number): { colour: boolean; background: boolean; full: boolean } => {
  const colour = (flags & FG) !== 0;
  const background = (flags & BG) !== 0;
  const full = (flags & FULL) !== 0;
  if (background && !colour) throw new Error("Packed Unicode ultra payload has invalid colour flags.");
  if (full && !background) throw new Error("Packed Unicode ultra payload has invalid full-colour flags.");
  return { colour, background, full };
};

const dimensions = (read: Reader): { columns: number; rows: number; count: number } => {
  const columns = read.varint();
  const rows = read.varint();
  const count = columns * rows;
  if (columns < 1 || rows < 1 || columns > 4096 || rows > 4096 || count > 2_000_000) {
    throw new Error("Packed Unicode ultra payload dimensions are invalid.");
  }
  return { columns, rows, count };
};

const maskBytes = (art: Art): Uint8Array => {
  const out = new Uint8Array(art.columns * art.rows);
  const lines = art.text.split("\n");
  let at = 0;
  for (let y = 0; y < art.rows; y += 1) {
    const chars = [...(lines[y] ?? "").padEnd(art.columns, "⠀")];
    for (let x = 0; x < art.columns; x += 1) {
      const code = (chars[x] ?? "⠀").codePointAt(0) ?? 0x2800;
      out[at++] = code >= 0x2800 && code <= 0x28ff ? code - 0x2800 : 0;
    }
  }
  return out;
};

const paeth = (left: number, up: number, diagonal: number): number => {
  const p = left + up - diagonal;
  const dl = Math.abs(p - left);
  const du = Math.abs(p - up);
  const dd = Math.abs(p - diagonal);
  return dl <= du && dl <= dd ? left : du <= dd ? up : diagonal;
};

const bitShuffle = (source: Uint8Array): Uint8Array => {
  const out = new Uint8Array(source.length);
  let target = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    for (let i = 0; i < source.length; i += 1) {
      if ((source[i]! & (1 << bit)) !== 0) {
        const at = target >> 3;
        out[at] = (out[at] ?? 0) | (1 << (target & 7));
      }
      target += 1;
    }
  }
  return out;
};

const bitUnshuffle = (source: Uint8Array): Uint8Array => {
  const out = new Uint8Array(source.length);
  let input = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    for (let i = 0; i < out.length; i += 1) {
      if ((source[input >> 3]! & (1 << (input & 7))) !== 0) out[i] = (out[i] ?? 0) | (1 << bit);
      input += 1;
    }
  }
  return out;
};

const predictMask = (source: Uint8Array, index: number, columns: number, mode: number): number => {
  const x = index % columns;
  const left = x > 0 ? source[index - 1]! : 0;
  const up = index >= columns ? source[index - columns]! : 0;
  const diagonal = x > 0 && index >= columns ? source[index - columns - 1]! : 0;
  if (mode === MASK_LEFT_XOR || mode === MASK_LEFT_DELTA) return left;
  if (mode === MASK_UP_XOR || mode === MASK_UP_DELTA) return up;
  return paeth(left, up, diagonal);
};

const transformMasks = (source: Uint8Array, columns: number, mode: number): Uint8Array => {
  const shuffled = mode >= MASK_BITS;
  const base = mode === MASK_BITS ? MASK_DIRECT : mode === MASK_BITS_LEFT ? MASK_LEFT_XOR : mode === MASK_BITS_UP ? MASK_UP_XOR : mode;
  const out = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    if (base === MASK_DIRECT) out[i] = source[i]!;
    else {
      const predictor = predictMask(source, i, columns, base);
      out[i] = base === MASK_LEFT_DELTA || base === MASK_UP_DELTA
        ? (source[i]! - predictor) & 0xff
        : source[i]! ^ predictor;
    }
  }
  return shuffled ? bitShuffle(out) : out;
};

const restoreMasks = (source: Uint8Array, columns: number, mode: number): Uint8Array => {
  const shuffled = mode >= MASK_BITS;
  const base = mode === MASK_BITS ? MASK_DIRECT : mode === MASK_BITS_LEFT ? MASK_LEFT_XOR : mode === MASK_BITS_UP ? MASK_UP_XOR : mode;
  const encoded = shuffled ? bitUnshuffle(source) : source;
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    if (base === MASK_DIRECT) out[i] = encoded[i]!;
    else {
      const predictor = predictMask(out, i, columns, base);
      out[i] = base === MASK_LEFT_DELTA || base === MASK_UP_DELTA
        ? (encoded[i]! + predictor) & 0xff
        : encoded[i]! ^ predictor;
    }
  }
  return out;
};

const pairKey = (cell: CellColour | undefined): number => {
  const fg = cell?.fg ? keyOf(cell.fg) + 1 : 0;
  const bg = cell?.bg ? keyOf(cell.bg) + 1 : 0;
  return fg * 16_777_217 + bg;
};

const pairFromKey = (key: number): CellColour => {
  const fg = Math.floor(key / 16_777_217);
  const bg = key % 16_777_217;
  return {
    ...(fg ? { fg: rgbOf(fg - 1) } : {}),
    ...(bg ? { bg: rgbOf(bg - 1) } : {}),
  };
};

const packPairPalette = (cells: readonly CellColour[] | undefined, count: number, out: number[]): void => {
  const freq = new Map<number, number>();
  for (let i = 0; i < count; i += 1) {
    const key = pairKey(cells?.[i]);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const keys = [...freq.keys()].sort((a, b) => (freq.get(b)! - freq.get(a)!) || a - b);
  putVar(out, keys.length);
  for (const key of keys) {
    const cell = pairFromKey(key);
    out.push((cell.fg ? FG : 0) | (cell.bg ? BG : 0));
    if (cell.fg) out.push(cell.fg.r, cell.fg.g, cell.fg.b);
    if (cell.bg) out.push(cell.bg.r, cell.bg.g, cell.bg.b);
  }
  const width = bitsFor(keys.length);
  if (!width) return;
  const index = new Map(keys.map((key, at) => [key, at]));
  const bits = new Bits();
  for (let i = 0; i < count; i += 1) bits.write(index.get(pairKey(cells?.[i]))!, width);
  out.push(...bits.finish());
};

const unpackPairPalette = (read: Reader, count: number): CellColour[] => {
  const size = read.varint();
  if (size < 1 || size > count) throw new Error("Packed Unicode ultra pair palette is invalid.");
  const palette: CellColour[] = [];
  for (let i = 0; i < size; i += 1) {
    const flags = read.byte();
    if ((flags & ~(FG | BG)) !== 0) throw new Error("Packed Unicode ultra pair palette contains invalid flags.");
    const fg = (flags & FG) ? { r: read.byte(), g: read.byte(), b: read.byte() } : undefined;
    const bg = (flags & BG) ? { r: read.byte(), g: read.byte(), b: read.byte() } : undefined;
    palette.push({ ...(fg ? { fg } : {}), ...(bg ? { bg } : {}) });
  }
  const width = bitsFor(size);
  if (!width) return Array.from({ length: count }, () => palette[0]!);
  const packed = read.bytesOf(Math.ceil(count * width / 8));
  const cells = new Array<CellColour>(count);
  for (let i = 0; i < count; i += 1) {
    const index = readBits(packed, i, width);
    if (index >= palette.length) throw new Error("Packed Unicode ultra pair palette index is invalid.");
    cells[i] = palette[index]!;
  }
  return cells;
};

const rgbPalette = (cells: readonly CellColour[] | undefined, count: number, background: boolean, sortRgb: boolean): { keys: number[]; index: Map<number, number> } => {
  const freq = new Map<number, number>();
  for (let i = 0; i < count; i += 1) {
    for (const bg of background ? [false, true] : [false]) {
      const rgb = cellRgb(cells?.[i], bg);
      if (!rgb) continue;
      const key = keyOf(rgb);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const keys = [...freq.keys()].sort(sortRgb ? (a, b) => a - b : (a, b) => (freq.get(b)! - freq.get(a)!) || a - b);
  return { keys, index: new Map(keys.map((key, at) => [key, at + 1])) };
};

const packRgbPalette = (cells: readonly CellColour[] | undefined, count: number, background: boolean, sortRgb: boolean, out: number[]): void => {
  const { keys, index } = rgbPalette(cells, count, background, sortRgb);
  putVar(out, keys.length);
  for (const key of keys) {
    const rgb = rgbOf(key);
    out.push(rgb.r, rgb.g, rgb.b);
  }
  const width = bitsFor(keys.length + 1);
  if (!width) return;
  const bits = new Bits();
  for (const bg of background ? [false, true] : [false]) {
    for (let i = 0; i < count; i += 1) {
      const rgb = cellRgb(cells?.[i], bg);
      bits.write(rgb ? index.get(keyOf(rgb))! : 0, width);
    }
  }
  out.push(...bits.finish());
};

const unpackRgbPalette = (read: Reader, count: number, background: boolean): CellColour[] => {
  const size = read.varint();
  if (size > count * (background ? 2 : 1)) throw new Error("Packed Unicode ultra RGB palette is invalid.");
  const palette: Rgb[] = [];
  for (let i = 0; i < size; i += 1) palette.push({ r: read.byte(), g: read.byte(), b: read.byte() });
  const width = bitsFor(size + 1);
  const streams = background ? 2 : 1;
  const packed = width ? read.bytesOf(Math.ceil(count * streams * width / 8)) : new Uint8Array();
  const fg = new Array<Rgb | undefined>(count);
  const bg = background ? new Array<Rgb | undefined>(count) : undefined;
  for (let stream = 0; stream < streams; stream += 1) {
    for (let i = 0; i < count; i += 1) {
      const value = width ? readBits(packed, stream * count + i, width) : 0;
      if (value > palette.length) throw new Error("Packed Unicode ultra RGB palette index is invalid.");
      const rgb = value ? palette[value - 1] : undefined;
      if (stream === 0) fg[i] = rgb;
      else bg![i] = rgb;
    }
  }
  return assembleCells(count, fg, bg);
};

interface Vec3 { readonly a: number; readonly b: number; readonly c: number; }

const toVec = (rgb: Rgb, ycocg: boolean): Vec3 => {
  if (!ycocg) return { a: rgb.r, b: rgb.g, c: rgb.b };
  const co = rgb.r - rgb.b;
  const t = rgb.b + (co >> 1);
  const cg = rgb.g - t;
  const y = t + (cg >> 1);
  return { a: y, b: co, c: cg };
};

const fromVec = (vec: Vec3, ycocg: boolean): Rgb => {
  if (!ycocg) return { r: vec.a, g: vec.b, b: vec.c };
  const t = vec.a - (vec.c >> 1);
  const g = vec.c + t;
  const b = t - (vec.b >> 1);
  const r = b + vec.b;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) throw new Error("Packed Unicode ultra YCoCg colour is invalid.");
  return { r, g, b };
};

const paethVec = (left?: Vec3, up?: Vec3, diagonal?: Vec3): Vec3 => ({
  a: paeth(left?.a ?? 0, up?.a ?? 0, diagonal?.a ?? 0),
  b: paeth(left?.b ?? 0, up?.b ?? 0, diagonal?.b ?? 0),
  c: paeth(left?.c ?? 0, up?.c ?? 0, diagonal?.c ?? 0),
});

const predictorVec = (values: readonly (Vec3 | undefined)[], index: number, columns: number, mode: number): Vec3 => {
  const x = index % columns;
  const left = x > 0 ? values[index - 1] : undefined;
  const up = index >= columns ? values[index - columns] : undefined;
  const diagonal = x > 0 && index >= columns ? values[index - columns - 1] : undefined;
  if (mode === COLOUR_DELTA_LEFT || mode === COLOUR_YCOCG_LEFT) return left ?? { a: 0, b: 0, c: 0 };
  if (mode === COLOUR_DELTA_UP || mode === COLOUR_YCOCG_UP) return up ?? { a: 0, b: 0, c: 0 };
  return paethVec(left, up, diagonal);
};

const presence = (cells: readonly CellColour[] | undefined, count: number, background: boolean): Uint8Array => {
  const out = new Uint8Array(Math.ceil(count / 8));
  for (let i = 0; i < count; i += 1) {
    if (!cellRgb(cells?.[i], background)) continue;
    const at = i >> 3;
    out[at] = (out[at] ?? 0) | (1 << (i & 7));
  }
  return out;
};

const packDeltaStream = (cells: readonly CellColour[] | undefined, count: number, columns: number, background: boolean, mode: number, out: number[]): void => {
  const ycocg = mode >= COLOUR_YCOCG_LEFT;
  const values = new Array<Vec3 | undefined>(count);
  const bits = presence(cells, count, background);
  out.push(...bits);
  for (let i = 0; i < count; i += 1) {
    const rgb = cellRgb(cells?.[i], background);
    if (!rgb) continue;
    const current = toVec(rgb, ycocg);
    const predictor = predictorVec(values, i, columns, mode);
    putVar(out, zig(current.a - predictor.a));
    putVar(out, zig(current.b - predictor.b));
    putVar(out, zig(current.c - predictor.c));
    values[i] = current;
  }
};

const unpackDeltaStream = (read: Reader, count: number, columns: number, mode: number): (Rgb | undefined)[] => {
  const ycocg = mode >= COLOUR_YCOCG_LEFT;
  const presenceBytes = read.bytesOf(Math.ceil(count / 8));
  const values = new Array<Vec3 | undefined>(count);
  const out = new Array<Rgb | undefined>(count);
  for (let i = 0; i < count; i += 1) {
    if ((presenceBytes[i >> 3]! & (1 << (i & 7))) === 0) continue;
    const predictor = predictorVec(values, i, columns, mode);
    const current = {
      a: predictor.a + unzig(read.varint()),
      b: predictor.b + unzig(read.varint()),
      c: predictor.c + unzig(read.varint()),
    };
    const rgb = fromVec(current, ycocg);
    values[i] = current;
    out[i] = rgb;
  }
  return out;
};

const assembleCells = (count: number, fg: readonly (Rgb | undefined)[], bg?: readonly (Rgb | undefined)[]): CellColour[] => {
  const out = new Array<CellColour>(count);
  for (let i = 0; i < count; i += 1) {
    const front = fg[i];
    const back = bg?.[i];
    out[i] = { ...(front ? { fg: front } : {}), ...(back ? { bg: back } : {}) };
  }
  return out;
};

const packOne = (art: Art, cfg: ArtCfg, maskMode: number, colourMode: number): Uint8Array => {
  const flags = flagsFor(cfg);
  const { colour, background } = readFlags(flags);
  const masks = maskBytes(art);
  const out: number[] = [MAGIC_A, MAGIC_B, VERSION, flags, maskMode, colour ? colourMode : COLOUR_NONE];
  putVar(out, art.columns);
  putVar(out, art.rows);
  out.push(...transformMasks(masks, art.columns, maskMode));
  if (!colour) return Uint8Array.from(out);

  if (colourMode === COLOUR_PAIR) packPairPalette(art.cellColours, masks.length, out);
  else if (colourMode === COLOUR_PALETTE || colourMode === COLOUR_PALETTE_RGB) packRgbPalette(art.cellColours, masks.length, background, colourMode === COLOUR_PALETTE_RGB, out);
  else {
    packDeltaStream(art.cellColours, masks.length, art.columns, false, colourMode, out);
    if (background) packDeltaStream(art.cellColours, masks.length, art.columns, true, colourMode, out);
  }
  return Uint8Array.from(out);
};

export const packUltraCandidates = (art: Art, cfg: ArtCfg): readonly UltraCandidate[] => {
  const colours = cfg.colour === true ? colourModes : [{ id: COLOUR_NONE, name: "none" }] as const;
  return maskModes.flatMap(mask => colours.map(colour => ({
    bytes: packOne(art, cfg, mask.id, colour.id),
    mask: mask.name,
    colour: colour.name,
  })));
};

export const isUltraRaw = (bytes: Uint8Array): boolean => bytes[0] === MAGIC_A && bytes[1] === MAGIC_B;

export const unpackUltra = (bytes: Uint8Array): PackedEmbed => {
  const read = new Reader(bytes);
  if (read.byte() !== MAGIC_A || read.byte() !== MAGIC_B || read.byte() !== VERSION) throw new Error("Packed Unicode ultra payload has the wrong signature.");
  const flags = read.byte();
  const maskMode = read.byte();
  const colourMode = read.byte();
  if (!maskModes.some(mode => mode.id === maskMode)) throw new Error("Packed Unicode ultra mask mode is not supported.");
  const { colour, background, full } = readFlags(flags);
  if (!colour && colourMode !== COLOUR_NONE) throw new Error("Packed Unicode ultra colour mode is invalid.");
  if (colour && !colourModes.some(mode => mode.id === colourMode)) throw new Error("Packed Unicode ultra colour mode is not supported.");
  const { columns, rows, count } = dimensions(read);
  const masks = restoreMasks(read.bytesOf(count), columns, maskMode);
  let cellColours: CellColour[] | undefined;

  if (colour) {
    if (colourMode === COLOUR_PAIR) cellColours = unpackPairPalette(read, count);
    else if (colourMode === COLOUR_PALETTE || colourMode === COLOUR_PALETTE_RGB) cellColours = unpackRgbPalette(read, count, background);
    else {
      const fg = unpackDeltaStream(read, count, columns, colourMode);
      const bg = background ? unpackDeltaStream(read, count, columns, colourMode) : undefined;
      cellColours = assembleCells(count, fg, bg);
    }
  }

  if (!read.done) throw new Error("Packed Unicode ultra payload contains trailing data.");
  return { columns, rows, masks, colour, colourBackground: background, fullColour: full, ...(cellColours ? { cellColours } : {}) };
};
