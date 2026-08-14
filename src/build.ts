import { chmod, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { build as buildPages, load as loadPages } from "../vendor/pages/src/index.ts";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const site = join(root, "site");
const assets = join(site, "assets");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const pages = await loadPages(join(root, "pages.config.ts"));
await buildPages(pages);
await mkdir(assets, { recursive: true });

const lib = await Bun.build({ entrypoints: [join(root, "src", "index.ts")], outdir: dist, target: "bun", format: "esm", sourcemap: "external", external: ["pngjs"] });
const cli = await Bun.build({ entrypoints: [join(root, "src", "cli.ts")], outdir: dist, target: "bun", format: "esm", sourcemap: "external", external: ["pngjs"] });
const web = await Bun.build({ entrypoints: [join(root, "src", "web.ts")], outdir: assets, target: "browser", format: "esm", naming: "app.js", minify: true, sourcemap: "none" });

for (const result of [lib, cli, web]) {
  if (result.success) continue;
  for (const log of result.logs) console.error(log);
  throw new Error("Build failed.");
}
await chmod(join(dist, "cli.js"), 0o755);
