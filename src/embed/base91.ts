export const base91Alphabet = Array.from({ length: 94 }, (_, index) => String.fromCharCode(33 + index))
  .filter(char => char !== "&" && char !== "<" && char !== ">")
  .join("");

const reverse = new Map([...base91Alphabet].map((char, index) => [char, index]));

export const base91Encode = (bytes: Uint8Array): string => {
  let out = "";
  let bits = 0;
  let count = 0;

  for (const byte of bytes) {
    bits |= byte << count;
    count += 8;
    if (count <= 13) continue;

    let value = bits & 8191;
    if (value > 88) {
      bits >>>= 13;
      count -= 13;
    } else {
      value = bits & 16383;
      bits >>>= 14;
      count -= 14;
    }

    out += base91Alphabet[value % 91]!;
    out += base91Alphabet[Math.floor(value / 91)]!;
  }

  if (count > 0) {
    out += base91Alphabet[bits % 91]!;
    if (count > 7 || bits > 90) out += base91Alphabet[Math.floor(bits / 91)]!;
  }

  return out;
};

export const base91Decode = (source: string): Uint8Array => {
  const text = source.trim();
  if (!text) throw new Error("Packed Unicode payload is empty.");

  const out: number[] = [];
  let value = -1;
  let bits = 0;
  let count = 0;

  for (const char of text) {
    const digit = reverse.get(char);
    if (digit === undefined) throw new Error("Packed Unicode payload contains invalid base91 data.");

    if (value < 0) {
      value = digit;
      continue;
    }

    value += digit * 91;
    bits |= value << count;
    count += (value & 8191) > 88 ? 13 : 14;

    while (count > 7) {
      out.push(bits & 0xff);
      bits >>>= 8;
      count -= 8;
    }
    value = -1;
  }

  if (value >= 0) out.push((bits | (value << count)) & 0xff);
  return Uint8Array.from(out);
};
