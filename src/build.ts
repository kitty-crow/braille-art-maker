import { cp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";
import { check } from "./check.ts";
import { inject, redirect, setBase } from "./html.ts";
import { href, relImport, routeFile, slash } from "./path.ts";
import type { BuildResult, LoadedCfg } from "./types.ts";

const templateRoot = resolve(import.meta.dir, "..");
const sharedStyles = join(templateRoot, "web", "styles");

export const build = async (loaded: LoadedCfg): Promise<BuildResult> => {
  await check(loaded);

  const { cfg, root } = loaded;
  const source = resolve(root, cfg.source);
  const out = resolve(root, cfg.out);
  const assets = slash(cfg.assets ?? "assets/pages");
  const assetRoot = join(out, assets);
  const madePages: string[] = [];
  const madeAssets: string[] = [];

  if (cfg.clean ?? true) await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  if (cfg.copySource ?? true) await cp(source, out, { recursive: true });

  for (const item of cfg.copy ?? []) {
    const target = join(out, item.to);
    await mkdir(dirname(target), { recursive: true });
    await cp(resolve(root, item.from), target, { recursive: true });
  }

  const css = await buildCss(loaded, assetRoot, assets);
  if (css) madeAssets.push(css);

  const scripts = await buildRuntime(loaded, assetRoot, assets);
  madeAssets.push(...scripts.files);

  for (const page of cfg.pages) {
    const target = routeFile(page.route);
    const sourceFile = join(source, page.from);
    const targetFile = join(out, target);
    let html = await readFile(sourceFile, "utf8");

    if (page.baseHref !== undefined) html = setBase(html, page.baseHref);

    if (page.inject ?? true) {
      const head: string[] = [];
      const body: string[] = [];

      if (scripts.boot) head.push(`<script src="${href(target, scripts.boot)}"></script>`);
      if (css) head.push(`<link rel="stylesheet" href="${href(target, css)}">`);
      if (scripts.runtime) body.push(`<script type="module" src="${href(target, scripts.runtime)}"></script>`);

      html = inject(html, { head, body });
    }

    await mkdir(dirname(targetFile), { recursive: true });
    await writeFile(targetFile, html, "utf8");
    madePages.push(target);

    const copiedSource = join(out, page.from);
    if (!(page.keepSource ?? false) && resolve(copiedSource) !== resolve(targetFile)) {
      await unlink(copiedSource).catch(() => undefined);
    }

    for (const legacy of page.legacy ?? []) {
      const legacyFile = join(out, legacy);
      const url = routeUrl(cfg.runtime?.base ?? "/", page.route);
      await mkdir(dirname(legacyFile), { recursive: true });
      await writeFile(legacyFile, redirect(url), "utf8");
      madePages.push(legacy);
    }
  }

  if (cfg.noJekyll ?? true) await writeFile(join(out, ".nojekyll"), "", "utf8");
  return { out, pages: madePages, assets: madeAssets };
};

const buildCss = async (loaded: LoadedCfg, assetRoot: string, assets: string): Promise<string | null> => {
  const css = loaded.cfg.css;
  if (!css || css.files.length === 0) return null;

  const styleOut = join(assetRoot, "styles");
  await mkdir(styleOut, { recursive: true });

  for (const file of css.files) await cp(join(sharedStyles, file), join(styleOut, file));

  const imports = css.files.map(file => `@import url("./styles/${file}");`);
  if (css.vars || css.dark) {
    await writeFile(join(styleOut, "project.css"), vars(css.vars, css.dark), "utf8");
    imports.push('@import url("./styles/project.css");');
  }

  const path = join(assetRoot, "styles.css");
  await writeFile(path, `${imports.join("\n")}\n`, "utf8");
  return posix.join(assets, "styles.css");
};

const buildRuntime = async (
  loaded: LoadedCfg,
  assetRoot: string,
  assets: string
): Promise<{ readonly boot: string | null; readonly runtime: string | null; readonly files: readonly string[] }> => {
  const runtime = loaded.cfg.runtime;
  if (!runtime) return { boot: null, runtime: null, files: [] };

  const cache = join(loaded.root, ".pages-cache");
  await rm(cache, { recursive: true, force: true });
  await mkdir(cache, { recursive: true });
  await mkdir(assetRoot, { recursive: true });

  const files: string[] = [];
  let bootPath: string | null = null;

  if (runtime.theme) {
    const entry = join(cache, "boot.ts");
    const source = `import { boot } from ${JSON.stringify(relImport(entry, join(import.meta.dir, "run", "theme.ts")))};\nboot(${JSON.stringify(runtime.theme)});\n`;
    await writeFile(entry, source, "utf8");
    await bundle(entry, assetRoot, "boot.js", false, loaded.cfg.minify ?? true);
    bootPath = posix.join(assets, "boot.js");
    files.push(bootPath);
  }

  const entry = join(cache, "runtime.ts");
  const source = `import { start } from ${JSON.stringify(relImport(entry, join(import.meta.dir, "run", "index.ts")))};\nstart(${JSON.stringify(runtime)});\n`;
  await writeFile(entry, source, "utf8");
  await bundle(entry, assetRoot, "runtime.js", true, loaded.cfg.minify ?? true);
  const runPath = posix.join(assets, "runtime.js");
  files.push(runPath);

  await rm(cache, { recursive: true, force: true });
  return { boot: bootPath, runtime: runPath, files };
};

const bundle = async (entry: string, out: string, name: string, esm: boolean, minify: boolean): Promise<void> => {
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: out,
    target: "browser",
    format: esm ? "esm" : "iife",
    naming: name,
    minify,
    sourcemap: "none"
  });

  if (result.success) return;
  for (const log of result.logs) console.error(log);
  throw new Error(`Could not build ${name}.`);
};

const vars = (
  light?: Readonly<Record<string, string>>,
  dark?: Readonly<Record<string, string>>
): string => {
  const block = (selector: string, values?: Readonly<Record<string, string>>): string => {
    if (!values || Object.keys(values).length === 0) return "";
    const lines = Object.entries(values).map(([key, value]) => `    ${key}: ${value};`);
    return `${selector} {\n${lines.join("\n")}\n}\n`;
  };

  return `${block(":root", light)}${block(':root[data-theme="dark"]', dark)}`;
};

const routeUrl = (base: string, route: string): string => {
  if (/^https?:\/\//.test(base)) {
    const root = new URL(base.endsWith("/") ? base : `${base}/`);
    return new URL(route.replace(/^\/+/, ""), root).href;
  }

  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root.replace(/\/$/, "")}${route}`.replace(/\/+/g, "/");
};
