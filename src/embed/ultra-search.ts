import { deflateSync } from "fflate";
import type { Art, ArtCfg } from "../types.ts";
import { encodeU4Japanese, type U4Mode } from "./codec.ts";
import { packRawV2Candidates } from "./raw.ts";
import { packUltraCandidates } from "./ultra-raw.ts";

export type BrotliFn = (bytes: Uint8Array) => Uint8Array;
export interface PackProgress { readonly done: number; readonly total: number; }
export type PackProgressFn = (progress: PackProgress) => void;

interface Scored {
  readonly bytes: Uint8Array;
  readonly score: number;
}
interface Best {
  readonly mode: U4Mode;
  readonly bytes: Uint8Array;
}

const fullSearchColumns = 256;
const deflate = (bytes: Uint8Array): Uint8Array => deflateSync(bytes, { level: 9, mem: 12 });
const choose = (best: Best | null, mode: U4Mode, bytes: Uint8Array): Best => {
  if (!best || bytes.length < best.bytes.length) return { mode, bytes };
  return best;
};

const packBounded = (art: Art, cfg: ArtCfg, brotli: BrotliFn, progress?: PackProgressFn): string => {
  const candidates = packRawV2Candidates(art, cfg);
  const total = Math.max(1, candidates.length * 3);
  let done = 0;
  let best: Best | null = null;
  const step = (): void => progress?.({ done: ++done, total });

  progress?.({ done: 0, total });
  for (const candidate of candidates) {
    best = choose(best, "r", candidate.bytes);
    step();
    best = choose(best, "d", deflate(candidate.bytes));
    step();
    best = choose(best, "b", brotli(candidate.bytes));
    step();
  }
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  progress?.({ done: total, total });
  return encodeU4Japanese(best.mode, best.bytes);
};

export const packU4 = (art: Art, cfg: ArtCfg, brotli: BrotliFn, progress?: PackProgressFn): string => {
  if (art.columns > fullSearchColumns) return packBounded(art, cfg, brotli, progress);

  progress?.({ done: 0, total: 1 });
  let best: Best | null = null;
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
    best = choose(best, "r", candidate.bytes);
    step();
    best = choose(best, "d", deflate(candidate.bytes));
    step();
    best = choose(best, "b", brotli(candidate.bytes));
    step();
  }

  const ultra: Scored[] = ultraRaw.map(candidate => {
    best = choose(best, "r", candidate.bytes);
    step();
    const compressed = deflate(candidate.bytes);
    best = choose(best, "d", compressed);
    step();
    return { bytes: candidate.bytes, score: compressed.length };
  });

  ultra.sort((a, b) => a.score - b.score || a.bytes.length - b.bytes.length);
  for (let i = 0; i < limit; i += 1) {
    const compressed = brotli(ultra[i]!.bytes);
    best = choose(best, "b", compressed);
    step();
  }
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  progress?.({ done: total, total });
  return encodeU4Japanese(best.mode, best.bytes);
};
