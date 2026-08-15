import { j8192Decode } from "../embed/j8192.ts";

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

const remainders = "0123456789ABC";

export const j8192EntropyValues = (payload: string): number[] => {
  const text = payload.trim();
  if (text[0] !== "&" || !["J", "K", "L"].includes(text[1] ?? "")) {
    throw new Error("Japanese ramble requires a J8192 u4 payload.");
  }
  const remainder = remainders.indexOf(text[2] ?? "");
  if (remainder < 0) throw new Error("J8192 payload has invalid remainder metadata.");
  const bytes = j8192Decode(text.slice(3), remainder as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12);
  return to13(bytes);
};
