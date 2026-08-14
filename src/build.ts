import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build as buildPages, load as loadPages } from "../vendor/pages/src/index.ts";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const site = join(root, "site");
const assets = join(site, "assets");
const api = join(site, "v1");
const tplDir = join(root, "templates", "embed");
const brotliWasm = join(root, "node_modules", "brotli-wasm", "pkg.web", "brotli_wasm_bg.wasm");
const cdn = "https://kitty-crow.github.io/braille-art-maker/v1/embed.js";
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { version: string };
const webVersion = pkg.version;

const makeClassic = async (path: string): Promise<void> => {
  const source = await readFile(path, "utf8");
  if (!source.includes("import.meta")) return;

  const runtimeUrl = "__unicodeArtRuntimeUrl";
  const body = source.replaceAll("import.meta.url", runtimeUrl);
  if (body.includes("import.meta")) throw new Error("Classic embed bundle contains unsupported import.meta syntax.");

  const wrapped = `(()=>{const ${runtimeUrl}=(document.currentScript&&document.currentScript.src)||location.href;${body}})();`;
  if (wrapped.includes("import.meta")) throw new Error("Classic embed bundle still contains import.meta syntax.");
  await writeFile(path, wrapped);
};

const versionWebEntry = async (): Promise<void> => {
  const path = join(site, "index.html");
  const source = await readFile(path, "utf8");
  const marker = 'src="assets/app.js"';
  if (!source.includes(marker)) throw new Error("Pages home does not contain the browser app entrypoint.");
  await writeFile(path, source.replace(marker, `src="assets/app.js?v=${encodeURIComponent(webVersion)}"`));
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const pages = await loadPages(join(root, "pages.config.ts"));
await buildPages(pages);
await versionWebEntry();
await mkdir(assets, { recursive: true });
await mkdir(api, { recursive: true });

const embedTpl = await readFile(join(tplDir, "embed.html"), "utf8");
const define = { __EMBED_HTML__: JSON.stringify(embedTpl), __EMBED_SRC__: JSON.stringify(cdn), __WEB_VERSION__: JSON.stringify(webVersion) };
const lib = await Bun.build({ entrypoints: [join(root, "src", "index.ts")], outdir: dist, target: "bun", format: "esm", sourcemap: "external", external: ["pngjs"], define });
const cli = await Bun.build({ entrypoints: [join(root, "src", "cli.ts")], outdir: dist, target: "bun", format: "esm", sourcemap: "external", external: ["pngjs"], define });
const web = await Bun.build({ entrypoints: [join(root, "src", "web.ts")], outdir: assets, target: "browser", format: "esm", naming: "app.js", minify: true, sourcemap: "none", define });
const worker = await Bun.build({ entrypoints: [join(root, "src", "web", "embed-worker.ts")], outdir: assets, target: "browser", format: "esm", naming: "embed-worker.js", minify: true, sourcemap: "none", define });
const embed = await Bun.build({
  entrypoints: [join(root, "src", "embed", "runtime.ts")], outdir: api, target: "browser", format: "iife", naming: "embed.js", minify: true, sourcemap: "none"
});

for (const result of [lib, cli, web, worker, embed]) {
  if (result.success) continue;
  for (const log of result.logs) console.error(log);
  throw new Error("Build failed.");
}

await makeClassic(join(api, "embed.js"));

await Promise.all([
  cp(join(tplDir, "embed.css"), join(api, "embed.css")),
  cp(join(tplDir, "load.js"), join(api, "load.js")),
  cp(brotliWasm, join(api, "brotli_wasm_bg.wasm")),
  cp(brotliWasm, join(assets, "brotli_wasm_bg.wasm")),
]);
await chmod(join(dist, "cli.js"), 0o755);
