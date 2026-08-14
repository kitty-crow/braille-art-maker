import { expect, test } from "bun:test";
import { cjk4096Decode, cjk4096Encode, cjk4096Range, type Cjk4096Remainder } from "../src/embed/cjk4096.ts";
import { decodeU4, encodeU4, encodeU4Cjk, type U4Mode } from "../src/embed/codec.ts";
import { packEmbedSmall, unpackEmbedSmall } from "../src/embed/small-bun.ts";
import { Tpl } from "../src/embed/tpl.ts";
import type { Art } from "../src/types.ts";

const bytes = (length: number): Uint8Array => Uint8Array.from({ length }, (_, index) => (index * 73 + index * index * 19 + 41) & 0xff);
const modes: readonly U4Mode[] = ["r", "d", "b"];

const noisyArt = (): Art => {
  const columns = 96;
  const rows = 48;
  const lines: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) {
      const mask = (x * 73 + y * 151 + x * y * 17 + (x ^ y) * 29) & 0xff;
      line += String.fromCodePoint(0x2800 + mask);
    }
    lines.push(line);
  }
  return {
    text: lines.join("\n"),
    columns,
    rows,
    dotsWidth: columns * 2,
    dotsHeight: rows * 4,
    threshold: 0.5,
    density: 0.5,
  };
};

test("CJK-4096 uses exactly U+4E00 through U+5DFF", () => {
  expect(cjk4096Range.first).toBe(0x4e00);
  expect(cjk4096Range.last).toBe(0x5dff);
  expect(cjk4096Range.last - cjk4096Range.first + 1).toBe(4096);
});

test("CJK-4096 round-trips every byte remainder without hidden padding", () => {
  for (let length = 0; length <= 257; length += 1) {
    const source = bytes(length);
    const encoded = cjk4096Encode(source);
    expect(encoded.remainder).toBe((length % 3) as Cjk4096Remainder);
    expect(encoded.body.length).toBe(Math.ceil(length * 2 / 3));
    expect(cjk4096Decode(encoded.body, encoded.remainder)).toEqual(source);
  }
});

test("CJK-4096 alphabet survives all standard Unicode normalization forms", () => {
  const alphabet = String.fromCharCode(...Array.from({ length: 4096 }, (_, index) => cjk4096Range.first + index));
  for (const form of ["NFC", "NFD", "NFKC", "NFKD"] as const) expect(alphabet.normalize(form)).toBe(alphabet);
});

test("u4 marks CJK transport explicitly and remains reversible for every compression mode", () => {
  for (const mode of modes) {
    for (const length of [1, 2, 3, 4, 5, 96]) {
      const source = bytes(length);
      const packed = encodeU4Cjk(mode, source);
      expect(packed).toMatch(/^&[RDB][012]/u);
      const decoded = decodeU4(packed);
      expect(decoded.mode).toBe(mode);
      expect(decoded.bytes).toEqual(source);
    }
  }
});

test("CJK-4096 is dramatically shorter in character count than basE91 for large binary payloads", () => {
  const source = bytes(12_288);
  const base91 = encodeU4("b", source);
  const cjk = encodeU4Cjk("b", source);
  expect(cjk.length).toBeLessThan(base91.length * 0.56);
  expect(decodeU4(cjk).bytes).toEqual(source);
});

test("u4 optimiser selects CJK-4096 for a representative non-trivial embed and decodes losslessly", async () => {
  const source = noisyArt();
  const packed = await packEmbedSmall(source, {});
  expect(packed).toMatch(/^&[RDB][012]/u);
  const decoded = await unpackEmbedSmall(packed, "u4");
  expect(decoded.columns).toBe(source.columns);
  expect(decoded.rows).toBe(source.rows);
  expect(decoded.masks.length).toBe(source.columns * source.rows);
});

test("embed template accepts marked CJK-4096 and still rejects arbitrary Unicode", () => {
  const payload = encodeU4Cjk("b", bytes(96));
  const html = new Tpl().make({
    data: payload,
    codec: "u4",
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: '<div><script type="application/octet-stream">{{DATA}}</script><script src="{{LOAD_SRC}}"></script></div>' });
  expect(html).toContain(`>4${payload}</script>`);

  const invalid = `&B0${String.fromCharCode(cjk4096Range.last + 1)}`;
  expect(() => new Tpl().make({
    data: invalid,
    codec: "u4",
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: "{{DATA}}" })).toThrow("unsafe CJK-4096");
});
