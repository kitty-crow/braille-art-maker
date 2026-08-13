import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { LoadedCfg } from "./types.ts";
import { routeFile } from "./path.ts";

const styleRoot = resolve(import.meta.dir, "..", "web", "styles");

export const check = async (loaded: LoadedCfg): Promise<void> => {
  const { cfg, root } = loaded;
  const source = resolve(root, cfg.source);
  const out = resolve(root, cfg.out);

  if (source === out) throw new Error("source and out must be different directories.");
  await requirePath(source, "source directory");

  const routes = new Set<string>();
  const outputs = new Set<string>();

  for (const page of cfg.pages) {
    if (!page.from.trim()) throw new Error("Every page requires a source file.");
    if (!page.route.startsWith("/")) throw new Error(`Route must start with /: ${page.route}`);
    if (page.route.includes("..")) throw new Error(`Route cannot contain ..: ${page.route}`);
    if (routes.has(page.route)) throw new Error(`Duplicate route: ${page.route}`);
    if (page.baseHref !== undefined && !page.baseHref.trim()) {
      throw new Error(`Page baseHref cannot be empty: ${page.route}`);
    }

    const output = routeFile(page.route);
    if (outputs.has(output)) throw new Error(`Routes share an output file: ${output}`);

    routes.add(page.route);
    outputs.add(output);
    await requirePath(join(source, page.from), `page source ${page.from}`);

    for (const legacy of page.legacy ?? []) {
      if (legacy.startsWith("/") || legacy.includes("..")) throw new Error(`Legacy path must be output-relative: ${legacy}`);
      if (outputs.has(legacy)) throw new Error(`Legacy path collides with another output: ${legacy}`);
      outputs.add(legacy);
    }
  }

  for (const copy of cfg.copy ?? []) {
    if (!copy.to.trim() || copy.to.startsWith("/") || copy.to.includes("..")) {
      throw new Error(`Copy destination must be output-relative: ${copy.to}`);
    }
    await requirePath(resolve(root, copy.from), `copy source ${copy.from}`);
  }

  for (const file of cfg.css?.files ?? []) {
    if (!/^[a-z0-9-]+\.css$/i.test(file)) throw new Error(`Invalid shared stylesheet name: ${file}`);
    await requirePath(join(styleRoot, file), `shared stylesheet ${file}`);
  }

  const base = cfg.runtime?.base;
  if (base && !base.startsWith("/") && !/^https?:\/\//.test(base)) {
    throw new Error("runtime.base must be an absolute path or URL.");
  }

  if (cfg.runtime?.kofi && !cfg.runtime.kofi.user.trim()) throw new Error("Ko-fi user cannot be empty.");
  if (cfg.runtime?.theme && !cfg.runtime.theme.key.trim()) throw new Error("Theme storage key cannot be empty.");
};

const requirePath = async (path: string, label: string): Promise<void> => {
  try {
    await stat(path);
  } catch {
    throw new Error(`Missing ${label}: ${path}`);
  }
};
