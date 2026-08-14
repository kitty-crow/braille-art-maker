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

/**
 * Lossless V1 raw payload for high-resolution browser handoff.
 *
 * This deliberately uses a chunked byte writer rather than a giant JS number[] so the
 * page can serialise one compact representation and transfer its ArrayBuffer to the
 * embed Worker without structured-cloning the Art/cellColours object graph.
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
