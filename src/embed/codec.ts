import { deflateSync, inflateSync } from "fflate";
import type { Art, ArtCfg } from "../types.ts";
import { decodeJapaneseCompact, encodeJapaneseCompact, isJapaneseCompactPayload } from "./japanese.ts";
import { base85Decode, base85Encode } from "./base85.ts";
import { base91Decode, base91Encode } from "./base91.ts";
import { cjk4096Decode, cjk4096Encode, type Cjk4096Remainder } from "./cjk4096.ts";
import { j8192Decode, j8192Encode, type J8192Remainder } from "./j8192.ts";
import { isRawPayload, packRawV1, packRawV2Candidates, unpackRaw, type PackedEmbed, type RawCandidate } from "./raw.ts";

export type EmbedCodec = "u1" | "u2" | "u3" | "u4";
export type U4Mode = "r" | "d" | "b";
export const embedCodec: EmbedCodec = "u4";

const jRemainders = "0123456789ABC";

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

export const packEmbed = (art: Art, cfg: ArtCfg, codec: "u1" | "u2" = "u2"): string => {
  const raw = packRawV1(art, cfg);
  return b64(codec === "u2" ? deflateSync(raw, { level: 9, mem: 12 }) : raw);
};

export const unpackEmbed = (source: string, codec?: "u1" | "u2"): PackedEmbed => {
  const encoded = unb64(source);
  const selected = codec ?? (isRawPayload(encoded) ? "u1" : "u2");
  if (selected === "u1") return unpackRaw(encoded);
  try { return unpackRaw(inflateSync(encoded)); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Packed Unicode")) throw error;
    throw new Error("Packed Unicode payload could not be decompressed.");
  }
};

export const bestRaw = (art: Art, cfg: ArtCfg): RawCandidate => {
  const candidates = packRawV2Candidates(art, cfg);
  let best = candidates[0];
  if (!best) throw new Error("No Unicode packing candidates were generated.");
  let bestSize = deflateSync(best.bytes, { level: 9, mem: 12 }).length;
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i]!;
    const size = deflateSync(candidate.bytes, { level: 9, mem: 12 }).length;
    if (size < bestSize || (size === bestSize && candidate.bytes.length < best.bytes.length)) {
      best = candidate;
      bestSize = size;
    }
  }
  return best;
};

export const encodeU3 = (compressed: Uint8Array): string => base85Encode(compressed);
export const decodeU3 = (source: string): Uint8Array => base85Decode(source);

export const encodeU4 = (mode: U4Mode, bytes: Uint8Array): string => {
  const body = base91Encode(bytes);
  return mode === "b" ? body : `&${mode}${body}`;
};

// Legacy 0.4.28 CJK-4096 encoder is kept exported so old callers remain source-compatible.
export const encodeU4Cjk = (mode: U4Mode, bytes: Uint8Array): string => {
  const encoded = cjk4096Encode(bytes);
  return `&${mode.toUpperCase()}${encoded.remainder}${encoded.body}`;
};

// Legacy 0.4.29 J8192 encoder remains available for source/backward compatibility.
export const encodeU4J = (mode: U4Mode, bytes: Uint8Array): string => {
  const encoded = j8192Encode(bytes);
  const marker = mode === "r" ? "J" : mode === "d" ? "K" : "L";
  return `&${marker}${jRemainders[encoded.remainder]}${encoded.body}`;
};

// Current Compact transport: the payload itself is reversible Japanese prose.
export const encodeU4Japanese = (mode: U4Mode, bytes: Uint8Array): string => encodeJapaneseCompact(mode, bytes);

export const decodeU4 = (source: string): { mode: U4Mode; bytes: Uint8Array } => {
  const text = source.trim();
  if (!text) throw new Error("Packed Unicode u4 payload is empty.");
  if (isJapaneseCompactPayload(text)) return decodeJapaneseCompact(text);
  if (!text.startsWith("&")) return { mode: "b", bytes: base91Decode(text) };

  const marker = text[1];
  if (marker === "J" || marker === "K" || marker === "L") {
    const remainder = jRemainders.indexOf(text[2] ?? "");
    if (remainder < 0) throw new Error("Packed Unicode u4 J8192 payload has invalid padding metadata.");
    const mode: U4Mode = marker === "J" ? "r" : marker === "K" ? "d" : "b";
    return { mode, bytes: j8192Decode(text.slice(3), remainder as J8192Remainder) };
  }

  if (marker === "R" || marker === "D" || marker === "B") {
    const remainderText = text[2];
    if (remainderText !== "0" && remainderText !== "1" && remainderText !== "2") {
      throw new Error("Packed Unicode u4 CJK-4096 payload has invalid padding metadata.");
    }
    const mode: U4Mode = marker === "R" ? "r" : marker === "D" ? "d" : "b";
    return { mode, bytes: cjk4096Decode(text.slice(3), Number(remainderText) as Cjk4096Remainder) };
  }

  if (marker !== "r" && marker !== "d") throw new Error("Packed Unicode u4 payload has an invalid compression mode.");
  return { mode: marker, bytes: base91Decode(text.slice(2)) };
};

export { unpackRaw } from "./raw.ts";
export type { PackedEmbed, RawCandidate } from "./raw.ts";
