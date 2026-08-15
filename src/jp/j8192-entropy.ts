import { decodeU4 } from "../embed/codec.ts";

const to13 = (bytes: Uint8Array): number[] => {
  const out: number[] = [];
  let bits = 0;
  let count = 0;
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    count += 8;
    while (count >= 13) {
      count -= 13;
      out.push((bits >>> count) & 0x1fff);
      bits &= count === 0 ? 0 : (1 << count) - 1;
    }
  }
  if (count > 0) out.push((bits << (13 - count)) & 0x1fff);
  return out;
};

// Interpret the exact u4 transport bytes as the same 13-bit symbols J8192 would carry.
// Tiny payloads left in legacy basE91 therefore get the same local presentation too.
export const j8192EntropyValues = (payload: string): number[] => {
  const { bytes } = decodeU4(payload);
  const values = to13(bytes);
  if (values.length === 0) throw new Error("Japanese ramble requires a non-empty u4 payload.");
  return values;
};

// Fold the whole payload into a bounded presentation stream. Every source symbol contributes,
// so large embeds do not need a correspondingly enormous DOM just to show their prose skin.
export const foldJ8192Entropy = (values: readonly number[], width: number): number[] => {
  if (values.length === 0) throw new Error("Japanese ramble entropy is empty.");
  const size = Math.max(1, Math.min(values.length, Math.round(width)));
  const out = new Array<number>(size).fill(0);
  for (let i = 0; i < values.length; i += 1) {
    const slot = i % size;
    const salt = Math.imul(i + 1, 0x45d9f3b) >>> 0;
    const rotated = ((values[i]! << (i % 7)) | (values[i]! >>> (13 - (i % 7 || 13)))) & 0x1fff;
    out[slot] = (out[slot]! ^ rotated ^ salt) & 0x1fff;
  }
  return out;
};
