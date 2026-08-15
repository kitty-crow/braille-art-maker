import { expect, test } from "bun:test";
import { decodeU4, encodeU4Japanese, type U4Mode } from "../src/embed/codec.ts";
import { decodeJapaneseCompact, encodeJapaneseCompact, japaneseCompactPrefix } from "../src/embed/japanese.ts";
import { Tpl } from "../src/embed/tpl.ts";

const modes: readonly U4Mode[] = ["r", "d", "b"];
const bytesFor = (seed: number, length: number): Uint8Array => {
  const out = new Uint8Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state ^ (state >>> 15), 2246822519) + 3266489917) >>> 0;
    out[i] = state & 0xff;
  }
  return out;
};

test("Japanese Compact is a single-line reversible payload", () => {
  for (const mode of modes) {
    for (let length = 0; length <= 96; length += 1) {
      const bytes = bytesFor(length * 7919 + mode.charCodeAt(0), length);
      if (length > 2) { bytes[0] = 0; bytes[1] = 0; }
      const encoded = encodeJapaneseCompact(mode, bytes);
      const decoded = decodeJapaneseCompact(encoded);
      expect(encoded.startsWith(japaneseCompactPrefix)).toBe(true);
      expect(encoded).not.toMatch(/[\r\n]/u);
      expect(encoded).toMatch(/[ぁ-んァ-ヶ一-龯。、、「」]/u);
      expect(decoded.mode).toBe(mode);
      expect([...decoded.bytes]).toEqual([...bytes]);
    }
  }
});

test("current u4 Japanese Compact transport round-trips exact bytes", () => {
  for (let seed = 1; seed <= 128; seed += 1) {
    const mode = modes[seed % modes.length]!;
    const bytes = bytesFor(seed, seed % 47);
    const encoded = encodeU4Japanese(mode, bytes);
    const decoded = decodeU4(encoded);
    expect(decoded.mode).toBe(mode);
    expect([...decoded.bytes]).toEqual([...bytes]);
    expect(encoded).not.toMatch(/^&[JKL]/u);
  }
});

test("new Compact embed stores only Japanese prose in the payload line", () => {
  const data = encodeU4Japanese("b", bytesFor(42, 32));
  const template = `<div data-unicode-art><script type="application/octet-stream" data-unicode-art-data data-codec="{{CODEC}}">{{DATA}}</script><script src="{{LOAD_SRC}}"></script></div>`;
  const html = new Tpl().make({
    data,
    codec: "u4",
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: template });
  const match = html.match(/data-unicode-art-data data-codec="u4">([^<]+)<\/script>/u);
  expect(match?.[1]).toBe(data);
  expect(match?.[1]?.startsWith(japaneseCompactPrefix)).toBe(true);
  expect(match?.[1]).not.toMatch(/^[1-4&]/u);
  expect(match?.[1]).not.toMatch(/[\r\n]/u);
  expect(decodeU4(match?.[1] ?? "").bytes).toEqual(decodeU4(data).bytes);
});

test("legacy template envelopes remain supported for callers without CODEC placeholder", () => {
  const data = encodeU4Japanese("r", Uint8Array.of(1, 2, 3));
  const template = `<script type="application/octet-stream" data-unicode-art-data>{{DATA}}</script>`;
  const html = new Tpl().make({ data, codec: "u4", theme: "auto", surface: "auto", src: "x/embed.js" }, { html: template });
  expect(html).toContain(`data-unicode-art-data>4${data}</script>`);
});
