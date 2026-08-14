import brotliPromise from "brotli-wasm";
import { inflateSync } from "fflate";
import type { Art, ArtCfg } from "../types.ts";
import { decodeU3, decodeU4, unpackEmbed, unpackRaw, type EmbedCodec, type PackedEmbed } from "./codec.ts";
import { isUltraRaw, unpackUltra } from "./ultra-raw.ts";
import { packU4 } from "./ultra-search.ts";

const unpackBytes = (bytes: Uint8Array): PackedEmbed => isUltraRaw(bytes) ? unpackUltra(bytes) : unpackRaw(bytes);

export const packEmbedSmall = async (art: Art, cfg: ArtCfg): Promise<string> => {
  const brotli = await brotliPromise;
  return packU4(art, cfg, bytes => brotli.compress(bytes, { quality: 11 }));
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
