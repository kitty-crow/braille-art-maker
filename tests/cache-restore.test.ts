import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beginCacheRestore, finishCacheRestore } from "../src/web/cache-guard.ts";

const root = join(import.meta.dir, "..");

test("a restore left pending by a dead page is rejected exactly once", () => {
  const values = new Map<string, string>();
  const fake = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } as unknown as Storage;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: fake } });
  try {
    expect(beginCacheRestore("0.4.30")).toBe(true);
    expect(beginCacheRestore("0.4.30")).toBe(false);
    expect(beginCacheRestore("0.4.30")).toBe(true);
    finishCacheRestore("0.4.30");
    expect(beginCacheRestore("0.4.30")).toBe(true);
    finishCacheRestore("0.4.30");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("huge embed source bypasses Markdown sanitising and syntax highlighting", async () => {
  const view = await readFile(join(root, "src", "web", "embed-view.ts"), "utf8");
  expect(view).toContain("const richHighlightLimit = 96_000;");
  expect(view).toContain("if (source.length > richHighlightLimit)");
  expect(view).toContain("this.plain(source);");
  expect(view).toContain("finishCacheRestore(__WEB_VERSION__);");
});

test("a repeated restore marker makes IndexedDB drop the latest snapshot before fallback", async () => {
  const store = await readFile(join(root, "src", "web", "art-store.ts"), "utf8");
  expect(store).toContain("if (!beginCacheRestore(version))");
  expect(store).toContain("await clearCachedArt().catch(() => {});");
  expect(store).toContain("clearCacheRestoreOnCleanExit(version);");
});
