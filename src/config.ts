import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { BuildCfg, LoadedCfg } from "./types.ts";

export const definePages = <T extends BuildCfg>(cfg: T): T => cfg;

export const load = async (file: string): Promise<LoadedCfg> => {
  const full = resolve(file);
  const url = `${pathToFileURL(full).href}?v=${Date.now()}`;
  const mod = await import(url) as Readonly<{ default?: unknown }>;
  const raw = mod.default;

  if (!isBuildCfg(raw)) throw new Error(`${file} must export a Pages build configuration as default.`);

  const base = dirname(full);
  const root = resolve(base, raw.root ?? ".");
  return { file: full, root, cfg: raw };
};

const isBuildCfg = (value: unknown): value is BuildCfg => {
  if (typeof value !== "object" || value === null) return false;
  const cfg = value as Partial<BuildCfg>;
  return typeof cfg.source === "string"
    && typeof cfg.out === "string"
    && Array.isArray(cfg.pages);
};
