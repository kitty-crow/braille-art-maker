import { expect, test } from "bun:test";
import { decodeU4, encodeU4, encodeU4J, type U4Mode } from "../src/embed/codec.ts";
import { j8192Alphabet, j8192Decode, j8192Encode, type J8192Remainder } from "../src/embed/j8192.ts";
import { packEmbedSmall, unpackEmbedSmall } from "../src/embed/small-bun.ts";
import { Tpl } from "../src/embed/tpl.ts";
import type { Art } from "../src/types.ts";

const bytes = (length: number): Uint8Array => Uint8Array.from({ length }, (_, index) => (index * 73 + index * index * 19 + 41) & 0xff);

const noisyArt = (): Art => {
  const columns = 96;
  const rows = 48;
  const lines: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) line += String.fromCodePoint(0x2800 + ((x * 73 + y * 151 + x * y * 17 + (x ^ y) * 29) & 0xff));
    lines.push(line);
  }
  return { text: lines.join("\n"), columns, rows, dotsWidth: columns * 2, dotsHeight: rows * 4, threshold: 0.5, density: 0.5 };
};

test("J8192 is exactly 8192 unique Japanese-oriented BMP symbols", () => {
  expect(j8192Alphabet.length).toBe(8192);
  expect(new Set(j8192Alphabet).size).toBe(8192);
  expect(j8192Alphabet).toContain("あ");
  expect(j8192Alphabet).toContain("ア");
  expect(j8192Alphabet).toContain("々");
  for (const char of j8192Alphabet) expect(char.codePointAt(0)!).toBeLessThanOrEqual(0xffff);
});

test("J8192 alphabet survives every standard Unicode normalization form", () => {
  for (const form of ["NFC", "NFD", "NFKC", "NFKD"] as const) expect(j8192Alphabet.normalize(form)).toBe(j8192Alphabet);
});

test("J8192 round-trips every 13-bit tail state exactly", () => {
  for (let length = 0; length <= 512; length += 1) {
    const source = bytes(length);
    const encoded = j8192Encode(source);
    expect(encoded.remainder).toBe(((length * 8) % 13) as J8192Remainder);
    expect(encoded.body.length).toBe(Math.ceil(length * 8 / 13));
    expect(j8192Decode(encoded.body, encoded.remainder)).toEqual(source);
  }
});

test("u4 marks J8192 explicitly and decodes all compression modes", () => {
  for (const mode of ["r", "d", "b"] as const satisfies readonly U4Mode[]) {
    for (const length of [1, 2, 3, 4, 5, 13, 96]) {
      const source = bytes(length);
      const packed = encodeU4J(mode, source);
      expect(packed).toMatch(/^&[JKL][0-9ABC]/u);
      const decoded = decodeU4(packed);
      expect(decoded.mode).toBe(mode);
      expect(decoded.bytes).toEqual(source);
    }
  }
});

test("J8192 is approximately half the basE91 character count", () => {
  const source = bytes(13_312);
  const base91 = encodeU4("b", source);
  const japanese = encodeU4J("b", source);
  expect(japanese.length).toBeLessThan(base91.length * 0.51);
  expect(decodeU4(japanese).bytes).toEqual(source);
});

test("u4 optimiser selects J8192 for representative art and remains lossless", async () => {
  const source = noisyArt();
  const packed = await packEmbedSmall(source, {});
  expect(packed).toMatch(/^&[JKL][0-9ABC]/u);
  const decoded = await unpackEmbedSmall(packed, "u4");
  expect(decoded.columns).toBe(source.columns);
  expect(decoded.rows).toBe(source.rows);
  expect(decoded.masks.length).toBe(source.columns * source.rows);
});

test("embed template accepts marked J8192 and rejects arbitrary payload characters", () => {
  const payload = encodeU4J("b", bytes(96));
  const html = new Tpl().make({
    data: payload,
    codec: "u4",
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: '<div><script type="application/octet-stream">{{DATA}}</script><script src="{{LOAD_SRC}}"></script></div>' });
  expect(html).toContain(`>4${payload}</script>`);

  expect(() => new Tpl().make({
    data: "&L0A",
    codec: "u4",
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: "{{DATA}}" })).toThrow("unsafe J8192");
});
