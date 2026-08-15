import { expect, test } from "bun:test";
import { originalLnCorpus } from "../src/jp/default.ts";
import { entropy13, japaneseRamble } from "../src/jp/ramble.ts";

test("bundled Japanese corpus is local, sizeable and structurally complete", () => {
  expect(originalLnCorpus.id).toBe("original-ln-v1");
  expect(originalLnCorpus.version).toBe(1);
  expect(originalLnCorpus.entries.length).toBeGreaterThanOrEqual(200);
  for (const kind of ["person", "noun", "place", "object", "verb", "adjective", "connector", "dialogue"] as const) {
    expect(originalLnCorpus.entries.some(entry => entry.kind === kind)).toBe(true);
  }
});

test("Japanese ramble is deterministic for the same 13-bit entropy", () => {
  const values = [0, 8191, 17, 2048, 4095, 73, 511, 7000, 1234, 42, 6123, 3001];
  const first = japaneseRamble(originalLnCorpus, entropy13(values), { sentences: 10 });
  const second = japaneseRamble(originalLnCorpus, entropy13(values), { sentences: 10 });
  expect(first).toBe(second);
  expect(first.split("\n")).toHaveLength(10);
  expect(first).toMatch(/[はがをにでへと]/u);
  expect(first).toMatch(/[。]/u);
});

test("Japanese ramble changes when J8192 entropy changes", () => {
  const a = japaneseRamble(originalLnCorpus, entropy13([1, 2, 3, 4, 5, 6, 7, 8]), { sentences: 6 });
  const b = japaneseRamble(originalLnCorpus, entropy13([8, 7, 6, 5, 4, 3, 2, 1]), { sentences: 6 });
  expect(a).not.toBe(b);
});

test("ramble caps requested output without changing the corpus", () => {
  const out = japaneseRamble(originalLnCorpus, entropy13([99]), { sentences: 500 });
  expect(out.split("\n")).toHaveLength(64);
  expect(originalLnCorpus.entries.length).toBeGreaterThanOrEqual(200);
});
