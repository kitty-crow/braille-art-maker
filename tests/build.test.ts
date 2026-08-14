import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("browser builds publish the Brotli WASM beside both bundles", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  expect(build).toContain('"brotli-wasm", "pkg.web", "brotli_wasm_bg.wasm"');
  expect(build).toContain('cp(brotliWasm, join(api, "brotli_wasm_bg.wasm"))');
  expect(build).toContain('cp(brotliWasm, join(assets, "brotli_wasm_bg.wasm"))');
});

test("classic embed build rewrites module-only import.meta URLs and rejects leftovers", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  expect(build).toContain('source.replaceAll("import.meta.url", runtimeUrl)');
  expect(build).toContain('(document.currentScript&&document.currentScript.src)||location.href');
  expect(build).toContain('if (body.includes("import.meta")) throw new Error');
  expect(build).toContain('await makeClassic(join(api, "embed.js"));');
});
