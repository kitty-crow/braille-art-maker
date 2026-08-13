import { expect, test } from "bun:test";
import { join } from "node:path";
import { build } from "../src/build.ts";
import { load } from "../src/config.ts";

const root = join(import.meta.dir, "..");

test("builds the neutral example", async () => {
  const loaded = await load(join(root, "example", "pages.config.ts"));
  const result = await build(loaded);
  const out = join(root, "example", "site");

  expect(result.pages).toContain("about/index.html");
  expect(await Bun.file(join(out, "index.html")).exists()).toBe(true);
  expect(await Bun.file(join(out, "about", "index.html")).exists()).toBe(true);
  expect(await Bun.file(join(out, "readme", "index.html")).exists()).toBe(true);
  expect(await Bun.file(join(out, "assets", "pages", "boot.js")).exists()).toBe(true);
  expect(await Bun.file(join(out, "assets", "pages", "runtime.js")).exists()).toBe(true);
  expect(await Bun.file(join(out, "assets", "pages", "styles.css")).exists()).toBe(true);
  expect(await Bun.file(join(out, "version.json")).exists()).toBe(true);
  expect(await Bun.file(join(out, ".nojekyll")).exists()).toBe(true);

  const home = await Bun.file(join(out, "index.html")).text();
  expect(home).toContain("assets/pages/boot.js");
  expect(home).toContain("assets/pages/runtime.js");

  const legacy = await Bun.file(join(out, "about.html")).text();
  expect(legacy).toContain("/about/");
});
