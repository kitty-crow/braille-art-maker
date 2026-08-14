import type { Art, ArtCfg, CellColour, Rgb } from "../types.ts";

const MAGIC_A = 0x55;
const MAGIC_B = 0x41;
const V1 = 1;
const FG = 1;
const BG = 2;
const FULL = 4;
const RESET = 0x80;
const RGB = 0x81;
const chunkSize = 64 * 1024;

export interface BoundedArt {
  readonly columns: number;
  readonly rows: number;
  readonly masks: Uint8Array;
  readonly colour: boolean;
  readonly colourBackground: boolean;
  readonly fullColour: boolean;
  readonly cellColours?: readonly CellColour[];
}

class Bytes {
  private readonly chunks: Uint8Array[] = [];
  private chunk = new Uint8Array(chunkSize);
  private at = 0;
  private total = 0;

  push(...values: number[]): void {
    for (const value of values) {
      if (this.at === this.chunk.length) this.flush();
      this.chunk[this.at++] = value & 0xff;
    }
  }

  finish(): Uint8Array {
    const out = new Uint8Array(this.total + this.at);
    let at = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    out.set(this.chunk.subarray(0, this.at), at);
    return out;
  }

  private flush(): void {
    this.chunks.push(this.chunk);
    this.total += this.chunk.length;
    this.chunk = new Uint8Array(chunkSize);
    this.at = 0;
  }
}

class Reader {
  private at = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get done(): boolean { return this.at === this.bytes.length; }

  byte(): number {
    const value = this.bytes[this.at++];
    if (value === undefined) throw new Error("Bounded Unicode payload ended unexpectedly.");
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
    throw new Error("Bounded Unicode payload contains an invalid integer.");
  }
}

const putVar = (out: Bytes, value: number): void => {
  let n = value >>> 0;
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
};

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
  if (background && !colour) throw new Error("Bounded Unicode payload has invalid colour flags.");
  if (full && !background) throw new Error("Bounded Unicode payload has invalid full-colour flags.");
  return { colour, background, full };
};

const maskBytes = (art: Art): Uint8Array => {
  const out = new Uint8Array(art.columns * art.rows);
  const lines = art.text.split("\n");
  let at = 0;
  for (let y = 0; y < art.rows; y += 1) {
    const line = lines[y] ?? "";
    for (let x = 0; x < art.columns; x += 1) {
      const code = x < line.length ? line.charCodeAt(x) : 0x2800;
      out[at++] = code >= 0x2800 && code <= 0x28ff ? code - 0x2800 : 0;
    }
  }
  return out;
};

const packBits = (source: Uint8Array, out: Bytes): void => {
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
      if (at + length > count) throw new Error("Bounded Unicode mask stream is too long.");
      for (let i = 0; i < length; i += 1) out[at++] = read.byte();
      continue;
    }
    if (control === RESET) throw new Error("Bounded Unicode mask stream contains an invalid token.");
    const length = 257 - control;
    if (at + length > count) throw new Error("Bounded Unicode mask run is too long.");
    out.fill(read.byte(), at, at + length);
    at += length;
  }
  return out;
};

const packColours = (cells: readonly CellColour[] | undefined, count: number, background: boolean, out: Bytes): void => {
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

const unpackColours = (read: Reader, count: number): (Rgb | undefined)[] => {
  const out = new Array<Rgb | undefined>(count);
  let previous: Rgb | undefined;
  let at = 0;
  while (at < count) {
    const token = read.byte();
    if (token <= 0x7f) {
      const run = token + 1;
      if (at + run > count) throw new Error("Bounded Unicode colour run is too long.");
      for (let i = 0; i < run; i += 1) out[at++] = previous;
      continue;
    }
    if (token === RESET) previous = undefined;
    else if (token === RGB) previous = { r: read.byte(), g: read.byte(), b: read.byte() };
    else throw new Error("Bounded Unicode colour stream contains an invalid token.");
    out[at++] = previous;
  }
  return out;
};

/**
 * Lossless V1 raw payload for high-resolution browser handoff and persistence.
 *
 * This deliberately uses a chunked byte writer rather than a giant JS number[] so the
 * page can serialise one compact representation and transfer or persist it without
 * structured-cloning the Art/cellColours object graph.
 */
export const packBoundedRaw = (art: Art, cfg: ArtCfg): Uint8Array => {
  const flags = flagsFor(cfg);
  const colour = (flags & FG) !== 0;
  const background = (flags & BG) !== 0;
  const out = new Bytes();
  out.push(MAGIC_A, MAGIC_B, V1, flags);
  putVar(out, art.columns);
  putVar(out, art.rows);
  const masks = maskBytes(art);
  packBits(masks, out);
  if (colour) packColours(art.cellColours, masks.length, false, out);
  if (background) packColours(art.cellColours, masks.length, true, out);
  return out.finish();
};

export const unpackBoundedRaw = (bytes: Uint8Array): BoundedArt => {
  const read = new Reader(bytes);
  if (read.byte() !== MAGIC_A || read.byte() !== MAGIC_B || read.byte() !== V1) throw new Error("Bounded Unicode payload header is invalid.");
  const { colour, background, full } = readFlags(read.byte());
  const columns = read.varint();
  const rows = read.varint();
  const count = columns * rows;
  if (columns < 1 || rows < 1 || !Number.isSafeInteger(count) || count > 8_000_000) throw new Error("Bounded Unicode payload dimensions are invalid.");
  const masks = unpackBits(read, count);
  const fg = colour ? unpackColours(read, count) : undefined;
  const bg = background ? unpackColours(read, count) : undefined;
  if (!read.done) throw new Error("Bounded Unicode payload has trailing data.");
  if (!colour) return { columns, rows, masks, colour: false, colourBackground: false, fullColour: false };
  const cellColours: CellColour[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const front = fg?.[i];
    const back = bg?.[i];
    cellColours[i] = { ...(front ? { fg: front } : {}), ...(back ? { bg: back } : {}) };
  }
  return { columns, rows, masks, colour: true, colourBackground: background, fullColour: full, cellColours };
};
