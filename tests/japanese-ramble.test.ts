import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { originalLnCorpus } from "../src/jp/default.ts";
import { entropy13, japaneseRamble } from "../src/jp/ramble.ts";

const root = join(import.meta.dir, "..");

test("bundled Japanese corpus is local, sizeable and structurally complete", () => {
  expect(originalLnCorpus.id).toBe("original-ln-v1");
  expect(originalLnCorpus.version).toBe(1);
  expect(originalLnCorpus.entries.length).toBeGreaterThanOrEqual(370);
  for (const kind of ["person", "noun", "place", "object", "verb", "adjective", "connector", "dialogue", "template"] as const) {
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

test("corpus templates resolve completely into Japanese prose", () => {
  const values = Array.from({ length: 512 }, (_, i) => (i * 811 + 97) & 0x1fff);
  const out = japaneseRamble(originalLnCorpus, entropy13(values), { sentences: 64 });
  expect(out.split("\n")).toHaveLength(64);
  expect(out).not.toMatch(/[{}|]/u);
  expect(out.split("\n").every(sentence => sentence.endsWith("。"))).toBe(true);
});

test("ramble caps requested output without changing the corpus", () => {
  const out = japaneseRamble(originalLnCorpus, entropy13([99]), { sentences: 500 });
  expect(out.split("\n")).toHaveLength(64);
  expect(originalLnCorpus.entries.length).toBeGreaterThanOrEqual(370);
});

test("maker exposes Japanese Ramble as a local presentation without changing copy semantics", async () => {
  const view = await readFile(join(root, "src", "web", "embed-view.ts"), "utf8");
  const local = await Promise.all([
    "default.ts", "corpus.ts", "j8192-entropy.ts", "ramble.ts",
  ].map(name => readFile(join(root, "src", "jp", name), "utf8")));
  const defaults = local[0]!;
  expect(defaults).toContain("original-ln-court-mystery-v1.xml");
  expect(defaults).toContain("original-ln-romance-books-magic-v1.xml");
  expect(defaults).toContain("original-ln-templates-v1.xml");
  expect(view).toContain('this.rambleTab = this.tab("Japanese Ramble", "ramble", false);');
  expect(view).toContain('this.renderRamble(this.compact);');
  expect(view).toContain('j8192EntropyValues(packed.data)');
  expect(view).toContain('foldJ8192Entropy(values');
  expect(view).toContain('japaneseRamble(originalLnCorpus');
  expect(view).toContain('if (this.mode !== "static") return;');
  expect(view).toContain('Copy embed still copies the compact data.');
  for (const source of local) expect(source).not.toContain("fetch(");
});
