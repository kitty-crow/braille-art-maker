import type { RuntimeCfg } from "../types.ts";
import { initKofi } from "./kofi.ts";
import { initReadme } from "./readme.ts";
import { initTheme } from "./theme.ts";
import { initVersion } from "./version.ts";

export const start = (cfg: RuntimeCfg): void => {
  initTheme(cfg.theme);
  initKofi(cfg.kofi);
  void initVersion(cfg.base, cfg.version);
  void initReadme(cfg.readme);
};

export { boot } from "./theme.ts";
