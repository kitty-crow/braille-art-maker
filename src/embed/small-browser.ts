import brotliPromise from "brotli-wasm";
import type { Art, ArtCfg } from "../types.ts";
import { decodeU3, encodeU3, unpackEmbed, unpackRaw, type EmbedCodec, type PackedEmbed } from "./codec.ts";
import { packRawV2Candidates } from "./raw.ts";

export const packEmbedSmall = async (art: Art, cfg: ArtCfg): Promise<string> => {
  const brotli = await brotliPromise;
  const candidates = packRawV2Candidates(art, cfg);
  let best: Uint8Array | undefined;
  for (const candidate of candidates) {
    const compressed = brotli.compress(candidate.bytes, { quality: 11 });
    if (!best || compressed.length < best.length) best = compressed;
  }
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  return encodeU3(best);
};

export const unpackEmbedSmall = async (source: string, codec: EmbedCodec): Promise<PackedEmbed> => {
  if (codec === "u1" || codec === "u2") return unpackEmbed(source, codec);
  const brotli = await brotliPromise;
  try { return unpackRaw(brotli.decompress(decodeU3(source))); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
    throw new Error("Packed Unicode payload could not be Brotli-decompressed.");
  }
};
