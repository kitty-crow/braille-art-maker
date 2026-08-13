import { expect, test } from "bun:test";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("keeps shared CSS separated and nested", async () => {
  const index = await Bun.file(join(root, "web", "styles.css")).text();
  const imports = index.split("\n").filter(Boolean);
  expect(imports.length).toBeGreaterThan(10);

  for (const line of imports) {
    const match = /styles\/([^"?]+\.css)/.exec(line);
    expect(match).not.toBeNull();
    const name = match?.[1] ?? "";
    expect(await Bun.file(join(root, "web", "styles", name)).exists()).toBe(true);
  }

  const nav = await Bun.file(join(root, "web", "styles", "nav.css")).text();
  expect(nav).toContain("& a");
  expect(nav).toContain("&:hover");
});

test("isolates the Ko-fi footer icon from project link styles", async () => {
  const kofi = await Bun.file(join(root, "web", "styles", "kofi.css")).text();
  expect(kofi).toContain(".pages-kofi-link");
  expect(kofi).toContain("&::before");
  expect(kofi).toContain("content: none !important");
  expect(kofi).toContain("width: 1.05rem !important");
  expect(kofi).toContain("max-height: 1.05rem !important");
});
