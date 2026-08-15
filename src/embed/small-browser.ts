import brotliPromise from "brotli-wasm";
import { deflateSync, inflateSync } from "fflate";
import type { Art, ArtCfg } from "../types.ts";
import { decodeU3, decodeU4, encodeU4, encodeU4J, encodeU4Japanese, unpackEmbed, unpackRaw, type EmbedCodec, type PackedEmbed, type U4Mode } from "./codec.ts";
import { isUltraRaw, unpackUltra } from "./ultra-raw.ts";
import { packU4, type PackProgressFn } from "./ultra-search.ts";

const unpackBytes = (bytes: Uint8Array): PackedEmbed => isUltraRaw(bytes) ? unpackUltra(bytes) : unpackRaw(bytes);

export const packEmbedSmall = async (
  art: Art,
  cfg: ArtCfg,
  progress?: PackProgressFn,
  story = false,
): Promise<string> => {
  const brotli = await brotliPromise;
  return packU4(art, cfg, bytes => brotli.compress(bytes, { quality: 11 }), progress, story);
};

export const packRawEmbedSmall = async (
  raw: Uint8Array,
  progress?: PackProgressFn,
  story = false,
): Promise<string> => {
  const brotli = await brotliPromise;
  const total = 3;
  let done = 0;
  const step = (): void => progress?.({ done: ++done, total });

  progress?.({ done: 0, total });
  const candidates: Array<{ readonly mode: U4Mode; readonly bytes: Uint8Array }> = [];
  candidates.push({ mode: "r", bytes: raw });
  step();
  candidates.push({ mode: "d", bytes: deflateSync(raw, { level: 9, mem: 12 }) });
  step();
  candidates.push({ mode: "b", bytes: brotli.compress(raw, { quality: 11 }) });
  step();

  if (story) {
    candidates.sort((a, b) => a.bytes.length - b.bytes.length);
    const best = candidates[0]!;
    return encodeU4Japanese(best.mode, best.bytes);
  }

  let best = "";
  for (const candidate of candidates) {
    for (const value of [encodeU4(candidate.mode, candidate.bytes), encodeU4J(candidate.mode, candidate.bytes)]) {
      if (!best || value.length < best.length) best = value;
    }
  }
  if (!best) throw new Error("No Unicode packing candidate was generated.");
  return best;
};

export const unpackEmbedSmall = async (source: string, codec: EmbedCodec): Promise<PackedEmbed> => {
  if (codec === "u1" || codec === "u2") return unpackEmbed(source, codec);
  const brotli = await brotliPromise;

  if (codec === "u3") {
    try { return unpackRaw(brotli.decompress(decodeU3(source))); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
      throw new Error("Packed Unicode payload could not be Brotli-decompressed.");
    }
  }

  try {
    const encoded = decodeU4(source);
    const raw = encoded.mode === "r" ? encoded.bytes : encoded.mode === "d" ? inflateSync(encoded.bytes) : brotli.decompress(encoded.bytes);
    return unpackBytes(raw);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
    throw new Error("Packed Unicode u4 payload could not be decoded.");
  }
};
