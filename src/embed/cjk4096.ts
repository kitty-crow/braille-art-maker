const first = 0x4e00;
const last = 0x5dff;

export type Cjk4096Remainder = 0 | 1 | 2;

const digit = (char: string): number => {
  const value = char.charCodeAt(0) - first;
  if (value < 0 || value > 0xfff) throw new Error("Packed Unicode payload contains invalid CJK-4096 data.");
  return value;
};

export const cjk4096Range = { first, last } as const;

export const cjk4096Encode = (bytes: Uint8Array): { body: string; remainder: Cjk4096Remainder } => {
  let body = "";
  let index = 0;
  const full = bytes.length - bytes.length % 3;

  for (; index < full; index += 3) {
    const value = bytes[index]! | bytes[index + 1]! << 8 | bytes[index + 2]! << 16;
    body += String.fromCharCode(first + (value & 0xfff), first + ((value >>> 12) & 0xfff));
  }

  const remainder = (bytes.length % 3) as Cjk4096Remainder;
  if (remainder === 1) {
    body += String.fromCharCode(first + bytes[index]!);
  } else if (remainder === 2) {
    const value = bytes[index]! | bytes[index + 1]! << 8;
    body += String.fromCharCode(first + (value & 0xfff), first + ((value >>> 12) & 0xf));
  }

  return { body, remainder };
};

export const cjk4096Decode = (source: string, remainder: Cjk4096Remainder): Uint8Array => {
  const text = source.trim();
  const count = text.length;
  if (remainder === 0 && count % 2 !== 0) throw new Error("Packed Unicode CJK-4096 payload has invalid padding.");
  if (remainder === 1 && count % 2 !== 1) throw new Error("Packed Unicode CJK-4096 payload has invalid padding.");
  if (remainder === 2 && (count < 2 || count % 2 !== 0)) throw new Error("Packed Unicode CJK-4096 payload has invalid padding.");

  const fullChars = count - (remainder === 1 ? 1 : remainder === 2 ? 2 : 0);
  const output = new Uint8Array(fullChars / 2 * 3 + remainder);
  let out = 0;

  for (let index = 0; index < fullChars; index += 2) {
    const value = digit(text[index]!) | digit(text[index + 1]!) << 12;
    output[out++] = value & 0xff;
    output[out++] = (value >>> 8) & 0xff;
    output[out++] = (value >>> 16) & 0xff;
  }

  if (remainder === 1) {
    const tail = digit(text[fullChars]!);
    if (tail > 0xff) throw new Error("Packed Unicode CJK-4096 payload has invalid padding.");
    output[out] = tail;
  } else if (remainder === 2) {
    const low = digit(text[fullChars]!);
    const high = digit(text[fullChars + 1]!);
    if (high > 0xf) throw new Error("Packed Unicode CJK-4096 payload has invalid padding.");
    output[out++] = low & 0xff;
    output[out] = ((low >>> 8) & 0xf) | high << 4;
  }

  return output;
};
