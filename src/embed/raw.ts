import type { Art, ArtCfg, CellColour, Rgb } from "../types.ts";

export interface PackedEmbed {
  readonly columns: number;
  readonly rows: number;
  readonly masks: Uint8Array;
  readonly colour: boolean;
  readonly colourBackground: boolean;
  readonly fullColour: boolean;
  readonly cellColours?: readonly CellColour[];
}

export interface RawCandidate {
  readonly bytes: Uint8Array;
  readonly mask: "direct" | "left" | "up";
  readonly colour: "legacy" | "palette" | "delta-left" | "delta-up";
}

const MAGIC_A = 0x55;
const MAGIC_B = 0x41;
const V1 = 1;
const V2 = 2;
const FG = 1;
const BG = 2;
const FULL = 4;
const RESET = 0x80;
const RGB = 0x81;

const MASK_DIRECT = 0;
const MASK_LEFT = 1;
const MASK_UP = 2;
const COLOUR_LEGACY = 0;
const COLOUR_PALETTE = 1;
const COLOUR_DELTA_LEFT = 2;
const COLOUR_DELTA_UP = 3;

class Reader {
  private at = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get done(): boolean { return this.at === this.bytes.length; }

  byte(): number {
    const value = this.bytes[this.at++];
    if (value === undefined) throw new Error("Packed Unicode payload ended unexpectedly.");
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
    throw new Error("Packed Unicode payload contains an invalid integer.");
  }
}

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
const keyOf = (rgb: Rgb): number => (rgb.r << 16) | (rgb.g << 8) | rgb.b;
const rgbOf = (key: number): Rgb => ({ r: (key >>> 16) & 0xff, g: (key >>> 8) & 0xff, b: key & 0xff });
const same = (a?: Rgb, b?: Rgb): boolean => (!a && !b) || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b);
const cellColour = (cell: CellColour | undefined, background: boolean): Rgb | undefined => background ? cell?.bg : cell?.fg;

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
  if (background && !colour) throw new Error("Packed Unicode payload has invalid colour flags.");
  if (full && !background) throw new Error("Packed Unicode payload has invalid full-colour flags.");
  return { colour, background, full };
};

const dimensions = (read: Reader): { columns: number; rows: number; count: number } => {
  const columns = read.varint();
  const rows = read.varint();
  const count = columns * rows;
  if (columns < 1 || rows < 1 || columns > 4096 || rows > 4096 || count > 2_000_000) {
    throw new Error("Packed Unicode payload dimensions are invalid.");
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

const packBits = (source: Uint8Array, out: number[]): void => {
  let i = 0;
  while (i < source.length) {
    let run = 1;
    while (i + run < source.length && run < 128 && source[i + run] === source[i]) run += 1;
    if (run >= 3) {
      out.push(257 - run, source[i]!);
      i += run;
      continue;
    }

    const start = i;
    i += run;
    while (i < source.length && i - start < 128) {
      let next = 1;
      while (i + next < source.length && next < 128 && source[i + next] === source[i]) next += 1;
      if (next >= 3) break;
      i += Math.min(next, 128 - (i - start));
    }
    out.push(i - start - 1);
    for (let p = start; p < i; p += 1) out.push(source[p]!);
  }
};

const unpackBits = (read: Reader, count: number): Uint8Array => {
  const out = new Uint8Array(count);
  let at = 0;
  while (at < count) {
    const control = read.byte();
    if (control <= 0x7f) {
      const length = control + 1;
      if (at + length > count) throw new Error("Packed Unicode mask stream is too long.");
      for (let i = 0; i < length; i += 1) out[at++] = read.byte();
      continue;
    }
    if (control === 0x80) throw new Error("Packed Unicode mask stream contains an invalid token.");
    const length = 257 - control;
    if (at + length > count) throw new Error("Packed Unicode mask run is too long.");
    out.fill(read.byte(), at, at + length);
    at += length;
  }
  return out;
};

const predictMasks = (source: Uint8Array, columns: number, mode: number): Uint8Array => {
  if (mode === MASK_DIRECT) return source;
  const out = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    const x = i % columns;
    const predictor = mode === MASK_LEFT
      ? (x > 0 ? source[i - 1]! : 0)
      : (i >= columns ? source[i - columns]! : 0);
    out[i] = source[i]! ^ predictor;
  }
  return out;
};

const restoreMasks = (source: Uint8Array, columns: number, mode: number): Uint8Array => {
  if (mode === MASK_DIRECT) return source;
  const out = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    const x = i % columns;
    const predictor = mode === MASK_LEFT
      ? (x > 0 ? out[i - 1]! : 0)
      : (i >= columns ? out[i - columns]! : 0);
    out[i] = source[i]! ^ predictor;
  }
  return out;
};

const packLegacyColours = (cells: readonly CellColour[] | undefined, count: number, background: boolean, out: number[]): void => {
  let previous: Rgb | undefined;
  let at = 0;
  while (at < count) {
    const current = cellColour(cells?.[at], background);
    if (same(current, previous)) {
      let run = 1;
      while (at + run < count && run < 128 && same(cellColour(cells?.[at + run], background), previous)) run += 1;
      out.push(run - 1);
      at += run;
      continue;
    }
    if (!current) out.push(RESET);
    else out.push(RGB, current.r, current.g, current.b);
    previous = current;
    at += 1;
  }
};

const unpackLegacyColours = (read: Reader, count: number): (Rgb | undefined)[] => {
  const out = new Array<Rgb | undefined>(count);
  let previous: Rgb | undefined;
  let at = 0;
  while (at < count) {
    const token = read.byte();
    if (token <= 0x7f) {
      const run = token + 1;
      if (at + run > count) throw new Error("Packed Unicode colour run is too long.");
      for (let i = 0; i < run; i += 1) out[at++] = previous;
      continue;
    }
    if (token === RESET) previous = undefined;
    else if (token === RGB) previous = { r: read.byte(), g: read.byte(), b: read.byte() };
    else throw new Error("Packed Unicode colour stream contains an invalid token.");
    out[at++] = previous;
  }
  return out;
};

const paletteFor = (cells: readonly CellColour[] | undefined, count: number, background: boolean): { palette: readonly Rgb[]; index: ReadonlyMap<number, number> } => {
  const freq = new Map<number, number>();
  for (let i = 0; i < count; i += 1) {
    for (const bg of background ? [false, true] : [false]) {
      const rgb = cellColour(cells?.[i], bg);
      if (!rgb) continue;
      const key = keyOf(rgb);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const keys = [...freq.keys()].sort((a, b) => (freq.get(b)! - freq.get(a)!) || a - b);
  const index = new Map<number, number>();
  keys.forEach((key, i) => index.set(key, i + 1));
  return { palette: keys.map(rgbOf), index };
};

const packPaletteColours = (cells: readonly CellColour[] | undefined, count: number, background: boolean, out: number[]): void => {
  const { palette, index } = paletteFor(cells, count, background);
  putVar(out, palette.length);
  for (const rgb of palette) out.push(rgb.r, rgb.g, rgb.b);
  for (const bg of background ? [false, true] : [false]) {
    for (let i = 0; i < count; i += 1) {
      const rgb = cellColour(cells?.[i], bg);
      putVar(out, rgb ? index.get(keyOf(rgb))! : 0);
    }
  }
};

const unpackPaletteColours = (read: Reader, count: number, background: boolean): { fg: (Rgb | undefined)[]; bg?: (Rgb | undefined)[] } => {
  const size = read.varint();
  if (size > count * 2) throw new Error("Packed Unicode palette is too large.");
  const palette: Rgb[] = [];
  for (let i = 0; i < size; i += 1) palette.push({ r: read.byte(), g: read.byte(), b: read.byte() });
  const sequence = (): (Rgb | undefined)[] => {
    const out = new Array<Rgb | undefined>(count);
    for (let i = 0; i < count; i += 1) {
      const value = read.varint();
      if (value > palette.length) throw new Error("Packed Unicode palette index is invalid.");
      out[i] = value ? palette[value - 1] : undefined;
    }
    return out;
  };
  const fg = sequence();
  return background ? { fg, bg: sequence() } : { fg };
};

const presence = (cells: readonly CellColour[] | undefined, count: number, background: boolean): Uint8Array => {
  const bits = new Uint8Array(Math.ceil(count / 8));
  for (let i = 0; i < count; i += 1) {
    if (!cellColour(cells?.[i], background)) continue;
    const at = i >> 3;
    bits[at] = (bits[at] ?? 0) | (1 << (i & 7));
  }
  return bits;
};

const packDeltaSequence = (cells: readonly CellColour[] | undefined, count: number, columns: number, background: boolean, up: boolean, out: number[]): void => {
  const bits = presence(cells, count, background);
  for (const byte of bits) out.push(byte);
  for (let i = 0; i < count; i += 1) {
    const current = cellColour(cells?.[i], background);
    if (!current) continue;
    const x = i % columns;
    const predictorIndex = up ? i - columns : i - 1;
    const usePredictor = up ? i >= columns : x > 0;
    const predictor = usePredictor ? cellColour(cells?.[predictorIndex], background) : undefined;
    putVar(out, zig(current.r - (predictor?.r ?? 0)));
    putVar(out, zig(current.g - (predictor?.g ?? 0)));
    putVar(out, zig(current.b - (predictor?.b ?? 0)));
  }
};

const unpackDeltaSequence = (read: Reader, count: number, columns: number, up: boolean): (Rgb | undefined)[] => {
  const bitCount = Math.ceil(count / 8);
  const bits = new Uint8Array(bitCount);
  for (let i = 0; i < bitCount; i += 1) bits[i] = read.byte();
  const out = new Array<Rgb | undefined>(count);
  for (let i = 0; i < count; i += 1) {
    if ((bits[i >> 3]! & (1 << (i & 7))) === 0) continue;
    const x = i % columns;
    const predictorIndex = up ? i - columns : i - 1;
    const usePredictor = up ? i >= columns : x > 0;
    const predictor = usePredictor ? out[predictorIndex] : undefined;
    const r = (predictor?.r ?? 0) + unzig(read.varint());
    const g = (predictor?.g ?? 0) + unzig(read.varint());
    const b = (predictor?.b ?? 0) + unzig(read.varint());
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) throw new Error("Packed Unicode colour delta is invalid.");
    out[i] = { r, g, b };
  }
  return out;
};

const packDeltaColours = (cells: readonly CellColour[] | undefined, count: number, columns: number, background: boolean, up: boolean, out: number[]): void => {
  packDeltaSequence(cells, count, columns, false, up, out);
  if (background) packDeltaSequence(cells, count, columns, true, up, out);
};

const unpackDeltaColours = (read: Reader, count: number, columns: number, background: boolean, up: boolean): { fg: (Rgb | undefined)[]; bg?: (Rgb | undefined)[] } => {
  const fg = unpackDeltaSequence(read, count, columns, up);
  return background ? { fg, bg: unpackDeltaSequence(read, count, columns, up) } : { fg };
};

const assembleCells = (count: number, fg: readonly (Rgb | undefined)[], bg?: readonly (Rgb | undefined)[]): CellColour[] => {
  const cells = new Array<CellColour>(count);
  for (let i = 0; i < count; i += 1) {
    const front = fg[i];
    const back = bg?.[i];
    cells[i] = { ...(front ? { fg: front } : {}), ...(back ? { bg: back } : {}) };
  }
  return cells;
};

export const packRawV1 = (art: Art, cfg: ArtCfg): Uint8Array => {
  const flags = flagsFor(cfg);
  const { colour, background } = readFlags(flags);
  const out: number[] = [MAGIC_A, MAGIC_B, V1, flags];
  putVar(out, art.columns);
  putVar(out, art.rows);
  const masks = maskBytes(art);
  packBits(masks, out);
  if (colour) packLegacyColours(art.cellColours, masks.length, false, out);
  if (background) packLegacyColours(art.cellColours, masks.length, true, out);
  return Uint8Array.from(out);
};

const packRawV2 = (art: Art, cfg: ArtCfg, maskMode: number, colourMode: number): Uint8Array => {
  const flags = flagsFor(cfg);
  const { colour, background } = readFlags(flags);
  const out: number[] = [MAGIC_A, MAGIC_B, V2, flags, maskMode, colourMode];
  putVar(out, art.columns);
  putVar(out, art.rows);
  const masks = maskBytes(art);
  packBits(predictMasks(masks, art.columns, maskMode), out);
  if (!colour) return Uint8Array.from(out);
  if (colourMode === COLOUR_LEGACY) {
    packLegacyColours(art.cellColours, masks.length, false, out);
    if (background) packLegacyColours(art.cellColours, masks.length, true, out);
  } else if (colourMode === COLOUR_PALETTE) {
    packPaletteColours(art.cellColours, masks.length, background, out);
  } else if (colourMode === COLOUR_DELTA_LEFT || colourMode === COLOUR_DELTA_UP) {
    packDeltaColours(art.cellColours, masks.length, art.columns, background, colourMode === COLOUR_DELTA_UP, out);
  } else {
    throw new Error("Unsupported Unicode colour packing mode.");
  }
  return Uint8Array.from(out);
};

export const packRawV2Candidates = (art: Art, cfg: ArtCfg): readonly RawCandidate[] => {
  const colour = cfg.colour === true;
  const masks = [
    { id: MASK_DIRECT, name: "direct" as const },
    { id: MASK_LEFT, name: "left" as const },
    { id: MASK_UP, name: "up" as const },
  ];
  const colours = colour ? [
    { id: COLOUR_LEGACY, name: "legacy" as const },
    { id: COLOUR_PALETTE, name: "palette" as const },
    { id: COLOUR_DELTA_LEFT, name: "delta-left" as const },
    { id: COLOUR_DELTA_UP, name: "delta-up" as const },
  ] : [{ id: COLOUR_LEGACY, name: "legacy" as const }];
  return masks.flatMap(mask => colours.map(colourMode => ({
    bytes: packRawV2(art, cfg, mask.id, colourMode.id),
    mask: mask.name,
    colour: colourMode.name,
  })));
};

const unpackV1 = (read: Reader): PackedEmbed => {
  const flags = read.byte();
  const { colour, background, full } = readFlags(flags);
  const { columns, rows, count } = dimensions(read);
  const masks = unpackBits(read, count);
  let cellColours: CellColour[] | undefined;
  if (colour) {
    const fg = unpackLegacyColours(read, count);
    const bg = background ? unpackLegacyColours(read, count) : undefined;
    cellColours = assembleCells(count, fg, bg);
  }
  if (!read.done) throw new Error("Packed Unicode payload contains trailing data.");
  return { columns, rows, masks, colour, colourBackground: background, fullColour: full, ...(cellColours ? { cellColours } : {}) };
};

const unpackV2 = (read: Reader): PackedEmbed => {
  const flags = read.byte();
  const maskMode = read.byte();
  const colourMode = read.byte();
  if (![MASK_DIRECT, MASK_LEFT, MASK_UP].includes(maskMode)) throw new Error("Packed Unicode mask predictor is not supported.");
  if (![COLOUR_LEGACY, COLOUR_PALETTE, COLOUR_DELTA_LEFT, COLOUR_DELTA_UP].includes(colourMode)) throw new Error("Packed Unicode colour packing mode is not supported.");
  const { colour, background, full } = readFlags(flags);
  const { columns, rows, count } = dimensions(read);
  const masks = restoreMasks(unpackBits(read, count), columns, maskMode);
  let cellColours: CellColour[] | undefined;
  if (colour) {
    let fg: (Rgb | undefined)[];
    let bg: (Rgb | undefined)[] | undefined;
    if (colourMode === COLOUR_LEGACY) {
      fg = unpackLegacyColours(read, count);
      bg = background ? unpackLegacyColours(read, count) : undefined;
    } else if (colourMode === COLOUR_PALETTE) {
      ({ fg, bg } = unpackPaletteColours(read, count, background));
    } else {
      ({ fg, bg } = unpackDeltaColours(read, count, columns, background, colourMode === COLOUR_DELTA_UP));
    }
    cellColours = assembleCells(count, fg, bg);
  }
  if (!read.done) throw new Error("Packed Unicode payload contains trailing data.");
  return { columns, rows, masks, colour, colourBackground: background, fullColour: full, ...(cellColours ? { cellColours } : {}) };
};

export const unpackRaw = (bytes: Uint8Array): PackedEmbed => {
  const read = new Reader(bytes);
  if (read.byte() !== MAGIC_A || read.byte() !== MAGIC_B) throw new Error("Packed Unicode payload has the wrong signature.");
  const version = read.byte();
  if (version === V1) return unpackV1(read);
  if (version === V2) return unpackV2(read);
  throw new Error("Packed Unicode payload version is not supported.");
};

export const isRawPayload = (bytes: Uint8Array): boolean => bytes[0] === MAGIC_A && bytes[1] === MAGIC_B;
