import { deflateSync, inflateSync } from "fflate";
import type { Art, ArtCfg, CellColour, Rgb } from "../types.ts";

export type EmbedCodec = "u1" | "u2";
export const embedCodec: EmbedCodec = "u2";

export interface PackedEmbed {
  readonly columns: number;
  readonly rows: number;
  readonly masks: Uint8Array;
  readonly colour: boolean;
  readonly colourBackground: boolean;
  readonly fullColour: boolean;
  readonly cellColours?: readonly CellColour[];
}

const MAGIC_A = 0x55;
const MAGIC_B = 0x41;
const VERSION = 1;
const FG = 1;
const BG = 2;
const FULL = 4;
const RESET = 0x80;
const RGB = 0x81;

const same = (a?: Rgb, b?: Rgb): boolean => (!a && !b) || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b);

const putVar = (out: number[], value: number): void => {
  let n = value >>> 0;
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
  out.push(n);
};

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
    let value = 0, shift = 0;
    while (shift <= 28) {
      const byte = this.byte();
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return value >>> 0;
      shift += 7;
    }
    throw new Error("Packed Unicode payload contains an invalid integer.");
  }
}

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

const packMasks = (source: Uint8Array, out: number[]): void => {
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
    const length = i - start;
    out.push(length - 1);
    for (let p = start; p < i; p += 1) out.push(source[p]!);
  }
};

const unpackMasks = (read: Reader, count: number): Uint8Array => {
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

const packColours = (cells: readonly CellColour[] | undefined, count: number, background: boolean, out: number[]): void => {
  let previous: Rgb | undefined;
  let at = 0;
  while (at < count) {
    const current = background ? cells?.[at]?.bg : cells?.[at]?.fg;
    if (same(current, previous)) {
      let run = 1;
      while (at + run < count && run < 128) {
        const next = background ? cells?.[at + run]?.bg : cells?.[at + run]?.fg;
        if (!same(next, previous)) break;
        run += 1;
      }
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
  let previous: Rgb | undefined, at = 0;
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

const b64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const unb64 = (source: string): Uint8Array => {
  const clean = source.trim().replaceAll("-", "+").replaceAll("_", "/");
  const padded = clean + "=".repeat((4 - clean.length % 4) % 4);
  let binary: string;
  try { binary = atob(padded); } catch { throw new Error("Packed Unicode payload is not valid base64url."); }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};

const rawPack = (art: Art, cfg: ArtCfg): Uint8Array => {
  const colour = cfg.colour === true;
  const colourBackground = colour && cfg.colourBackground === true;
  const fullColour = colourBackground && cfg.fullColour === true;
  const flags = (colour ? FG : 0) | (colourBackground ? BG : 0) | (fullColour ? FULL : 0);
  const out: number[] = [MAGIC_A, MAGIC_B, VERSION, flags];
  putVar(out, art.columns);
  putVar(out, art.rows);
  const masks = maskBytes(art);
  packMasks(masks, out);
  if (colour) packColours(art.cellColours, masks.length, false, out);
  if (colourBackground) packColours(art.cellColours, masks.length, true, out);
  return Uint8Array.from(out);
};

const rawUnpack = (bytes: Uint8Array): PackedEmbed => {
  const read = new Reader(bytes);
  if (read.byte() !== MAGIC_A || read.byte() !== MAGIC_B) throw new Error("Packed Unicode payload has the wrong signature.");
  if (read.byte() !== VERSION) throw new Error("Packed Unicode payload version is not supported.");
  const flags = read.byte();
  const colour = (flags & FG) !== 0;
  const colourBackground = (flags & BG) !== 0;
  const fullColour = (flags & FULL) !== 0;
  if (colourBackground && !colour) throw new Error("Packed Unicode payload has invalid colour flags.");
  if (fullColour && !colourBackground) throw new Error("Packed Unicode payload has invalid full-colour flags.");
  const columns = read.varint(), rows = read.varint();
  if (columns < 1 || rows < 1 || columns > 4096 || rows > 4096 || columns * rows > 2_000_000) throw new Error("Packed Unicode payload dimensions are invalid.");
  const count = columns * rows;
  const masks = unpackMasks(read, count);
  let cellColours: CellColour[] | undefined;
  if (colour) {
    const fg = unpackColours(read, count);
    const bg = colourBackground ? unpackColours(read, count) : undefined;
    cellColours = new Array<CellColour>(count);
    for (let i = 0; i < count; i += 1) {
      const front = fg[i], back = bg?.[i];
      cellColours[i] = { ...(front ? { fg: front } : {}), ...(back ? { bg: back } : {}) };
    }
  }
  if (!read.done) throw new Error("Packed Unicode payload contains trailing data.");
  return { columns, rows, masks, colour, colourBackground, fullColour, ...(cellColours ? { cellColours } : {}) };
};

export const packEmbed = (art: Art, cfg: ArtCfg, codec: EmbedCodec = embedCodec): string => {
  const raw = rawPack(art, cfg);
  return b64(codec === "u2" ? deflateSync(raw, { level: 9 }) : raw);
};

export const unpackEmbed = (source: string, codec?: EmbedCodec): PackedEmbed => {
  const encoded = unb64(source);
  const selected = codec ?? (encoded[0] === MAGIC_A && encoded[1] === MAGIC_B ? "u1" : "u2");
  if (selected === "u1") return rawUnpack(encoded);
  try { return rawUnpack(inflateSync(encoded)); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
    throw new Error("Packed Unicode payload could not be decompressed.");
  }
};
