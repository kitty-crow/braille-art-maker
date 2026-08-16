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

test("browser app and worker cache keys follow the deployed revision", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  const worker = await readFile(join(root, "src", "web", "embed.ts"), "utf8");
  expect(build).toContain('process.env.GITHUB_SHA?.slice(0, 12) || webVersion');
  expect(build).toContain('src="assets/app.js?v=${encodeURIComponent(webCache)}"');
  expect(build).toContain('__WEB_CACHE__: JSON.stringify(webCache)');
  expect(worker).toContain('declare const __WEB_CACHE__: string;');
  expect(worker).toContain('workerUrl.searchParams.set("v", __WEB_CACHE__);');
});

test("classic embed build rewrites module-only import.meta URLs and rejects leftovers", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  expect(build).toContain('source.replaceAll("import.meta.url", runtimeUrl)');
  expect(build).toContain('(document.currentScript&&document.currentScript.src)||location.href');
  expect(build).toContain('if (body.includes("import.meta")) throw new Error');
  expect(build).toContain('await makeClassic(join(api, "embed.js"));');
});
