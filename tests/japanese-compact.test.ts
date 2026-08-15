import { expect, test } from "bun:test";
import { decodeU4, encodeU4Japanese, type U4Mode } from "../src/embed/codec.ts";
import { decodeJapaneseCompact, encodeJapaneseCompact, japaneseCompactPrefix } from "../src/embed/japanese.ts";
import { authenticJapaneseSentences, authenticJapaneseSources } from "../src/jp/authentic.ts";
import { originalLnCorpusV1, originalLnCorpusV2 } from "../src/jp/default.ts";
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

test("story payload is single-line and reversible", () => {
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

test("current story transport is the authentic Aozora v3 corpus", () => {
  const encoded = encodeJapaneseCompact("r", Uint8Array.of(1, 2, 3));
  expect(encoded).toContain("【青空文庫コーパス第三版】");
  expect(encoded).not.toContain("静かな魔法の気配が、物語の奥で揺れている。");
  expect(decodeJapaneseCompact(encoded).bytes).toEqual(Uint8Array.of(1, 2, 3));
});

test("every active story sentence has explicit public-domain provenance", () => {
  expect(authenticJapaneseSentences).toHaveLength(64);
  const sourceIds = new Set(authenticJapaneseSources.map(source => source.id));
  expect(sourceIds.size).toBe(authenticJapaneseSources.length);
  for (const source of authenticJapaneseSources) {
    expect(source.status).toBe("public-domain");
    expect(source.card).toMatch(/^https:\/\/www\.aozora\.gr\.jp\/cards\//u);
  }
  for (const entry of authenticJapaneseSentences) {
    expect(sourceIds.has(entry.source)).toBe(true);
    expect(entry.text.length).toBeGreaterThan(0);
  }
  for (const source of authenticJapaneseSources) {
    expect(authenticJapaneseSentences.filter(entry => entry.source === source.id)).toHaveLength(16);
  }
});

test("synthetic v1 and v2 tables are frozen for decoding, not active encoding", () => {
  const v1 = new Set(originalLnCorpusV1.entries.map(entry => entry.text));
  const v2 = new Set(originalLnCorpusV2.entries.map(entry => entry.text));
  const active = new Set(authenticJapaneseSentences.map(entry => entry.text));
  for (const text of [
    "人前が苦手な魔術師",
    "王立魔術学院",
    "術式を書いたノート",
    "声に出さなくても術式は成立します",
  ]) {
    expect(v2.has(text)).toBe(true);
    expect(v1.has(text)).toBe(false);
    expect(active.has(text)).toBe(false);
  }
});

test("active authentic sentence bank is unique and prefix-free", () => {
  const sentences = authenticJapaneseSentences.map(entry => entry.text);
  expect(new Set(sentences).size).toBe(sentences.length);
  for (let i = 0; i < sentences.length; i += 1) {
    for (let j = 0; j < sentences.length; j += 1) {
      if (i !== j) expect(sentences[j]!.startsWith(sentences[i]!)).toBe(false);
    }
  }
});

test("story payload uses bounded chapters for large byte streams", () => {
  const bytes = bytesFor(0x51f15e, 16 * 1024);
  bytes[0] = 0;
  bytes[1] = 0;
  const encoded = encodeJapaneseCompact("b", bytes);
  const decoded = decodeJapaneseCompact(encoded);
  expect(encoded).toContain("――そして、物語は次の章へ。");
  expect(encoded).not.toMatch(/[\r\n]/u);
  expect(decoded.mode).toBe("b");
  expect(decoded.bytes).toEqual(bytes);
});

test("u4 story transport round-trips exact bytes", () => {
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

test("story Compact embed stores only Japanese prose in the payload line", () => {
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
