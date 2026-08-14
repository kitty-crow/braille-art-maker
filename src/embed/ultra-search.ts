import { deflateSync } from "fflate";
import type { Art, ArtCfg } from "../types.ts";
import { encodeU4 } from "./codec.ts";
import { packRawV1, packRawV2Candidates } from "./raw.ts";
import { packUltraCandidates } from "./ultra-raw.ts";

export type BrotliFn = (bytes: Uint8Array) => Uint8Array;
export interface PackProgress { readonly done: number; readonly total: number; }
export type PackProgressFn = (progress: PackProgress) => void;

interface Scored {
  readonly bytes: Uint8Array;
  readonly score: number;
}

const deflate = (bytes: Uint8Array): Uint8Array => deflateSync(bytes, { level: 9, mem: 12 });

const packLarge = (art: Art, cfg: ArtCfg, brotli: BrotliFn, progress?: PackProgressFn): string => {
  const total = 3;
  let done = 0;
  let best = "";
  const step = (): void => progress?.({ done: ++done, total });
  const consider = (value: string): void => { if (!best || value.length < best.length) best = value; };
  const raw = packRawV1(art, cfg);
  consider(encodeU4("r", raw));
  step();
  consider(encodeU4("d", deflate(raw)));
  step();
  consider(encodeU4("b", brotli(raw)));
  step();
  return best;
};

export const packU4 = (art: Art, cfg: ArtCfg, brotli: BrotliFn, progress?: PackProgressFn): string => {
  progress?.({ done: 0, total: 1 });

  // Above the original 256-column envelope, favour one strong lossless raw representation
  // over materialising dozens of full-size exact candidates at once. Brotli/DEFLATE still
  // compete for the shortest transport, but peak memory stays bounded and no giant spread
  // operations from the ultra candidate family are reached.
  if (art.columns > 256) return packLarge(art, cfg, brotli, progress);

  let best = "";
  const consider = (value: string): void => {
    if (!best || value.length < best.length) best = value;
  };

  const legacy = packRawV2Candidates(art, cfg);
  const ultraRaw = packUltraCandidates(art, cfg);
  const cells = art.columns * art.rows;
  const limit = cfg.colour !== true
    ? ultraRaw.length
    : cells <= 4096
      ? ultraRaw.length
      : cells <= 12_000
        ? Math.min(30, ultraRaw.length)
        : Math.min(18, ultraRaw.length);
  const total = Math.max(1, legacy.length * 3 + ultraRaw.length * 2 + limit);
  let done = 0;
  const step = (): void => progress?.({ done: ++done, total });

  for (const candidate of legacy) {
    consider(encodeU4("r", candidate.bytes));
    step();
    const compressed = deflate(candidate.bytes);
    consider(encodeU4("d", compressed));
    step();
    consider(encodeU4("b", brotli(candidate.bytes)));
    step();
  }

  const ultra: Scored[] = ultraRaw.map(candidate => {
    consider(encodeU4("r", candidate.bytes));
    step();
    const compressed = deflate(candidate.bytes);
    consider(encodeU4("d", compressed));
    step();
    return { bytes: candidate.bytes, score: compressed.length };
  });

  ultra.sort((a, b) => a.score - b.score || a.bytes.length - b.bytes.length);
  for (let i = 0; i < limit; i += 1) {
    consider(encodeU4("b", brotli(ultra[i]!.bytes)));
    step();
  }
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  progress?.({ done: total, total });
  return best;
};
