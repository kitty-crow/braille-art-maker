import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import type { Art, ArtCfg } from "../types.ts";
import { decodeU3, encodeU3, unpackEmbed, unpackRaw, type EmbedCodec, type PackedEmbed } from "./codec.ts";
import { packRawV2Candidates } from "./raw.ts";

const compress = (bytes: Uint8Array): Uint8Array => new Uint8Array(brotliCompressSync(bytes, {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
  },
}));

export const packEmbedSmall = async (art: Art, cfg: ArtCfg): Promise<string> => {
  const candidates = packRawV2Candidates(art, cfg);
  let best: Uint8Array | undefined;
  for (const candidate of candidates) {
    const compressed = compress(candidate.bytes);
    if (!best || compressed.length < best.length) best = compressed;
  }
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  return encodeU3(best);
};

export const unpackEmbedSmall = async (source: string, codec: EmbedCodec): Promise<PackedEmbed> => {
  if (codec === "u1" || codec === "u2") return unpackEmbed(source, codec);
  try { return unpackRaw(new Uint8Array(brotliDecompressSync(decodeU3(source)))); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
    throw new Error("Packed Unicode payload could not be Brotli-decompressed.");
  }
};
