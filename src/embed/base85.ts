export const base85Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%()*+,-.:=?@[]^_{|}~";
const reverse = new Map([...base85Alphabet].map((char, index) => [char, index]));

const word = (bytes: Uint8Array, at: number): number => (
  (bytes[at]! * 0x1000000) +
  ((bytes[at + 1] ?? 0) << 16) +
  ((bytes[at + 2] ?? 0) << 8) +
  (bytes[at + 3] ?? 0)
) >>> 0;

export const base85Encode = (bytes: Uint8Array): string => {
  const pad = (4 - bytes.length % 4) % 4;
  let out = base85Alphabet[pad]!;
  for (let at = 0; at < bytes.length + pad; at += 4) {
    let value = word(bytes, at);
    const chars = new Array<string>(5);
    for (let i = 4; i >= 0; i -= 1) {
      chars[i] = base85Alphabet[value % 85]!;
      value = Math.floor(value / 85);
    }
    out += chars.join("");
  }
  return out;
};

export const base85Decode = (source: string): Uint8Array => {
  const text = source.trim();
  if (!text) throw new Error("Packed Unicode payload is empty.");
  const pad = reverse.get(text[0]!);
  if (pad === undefined || pad > 3) throw new Error("Packed Unicode payload has invalid base85 padding.");
  const body = text.slice(1);
  if (body.length % 5 !== 0) throw new Error("Packed Unicode payload has invalid base85 length.");
  const bytes = new Uint8Array(body.length / 5 * 4);
  let out = 0;
  for (let at = 0; at < body.length; at += 5) {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const digit = reverse.get(body[at + i]!);
      if (digit === undefined) throw new Error("Packed Unicode payload contains an invalid base85 character.");
      value = value * 85 + digit;
    }
    if (value > 0xffffffff) throw new Error("Packed Unicode payload contains an invalid base85 word.");
    bytes[out++] = (value >>> 24) & 0xff;
    bytes[out++] = (value >>> 16) & 0xff;
    bytes[out++] = (value >>> 8) & 0xff;
    bytes[out++] = value & 0xff;
  }
  if (pad > bytes.length) throw new Error("Packed Unicode payload has invalid base85 padding.");
  return bytes.subarray(0, bytes.length - pad);
};
