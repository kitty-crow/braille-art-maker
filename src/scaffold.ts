import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { slash } from "./path.ts";

export interface InitCfg {
  readonly target: string;
  readonly name: string;
  readonly repo: string;
  readonly base: string;
  readonly kofi?: string;
  readonly force?: boolean;
}

const source = resolve(import.meta.dir, "..", "scaffold");
const template = resolve(import.meta.dir, "..");

export const init = async (cfg: InitCfg): Promise<void> => {
  const target = resolve(cfg.target);
  const exists = await Bun.file(`${target}/pages.config.ts`).exists();
  if (exists && !(cfg.force ?? false)) throw new Error(`${target} already contains pages.config.ts.`);

  const [owner, repo] = splitRepo(cfg.repo);
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: cfg.force ?? false });

  const templatePath = slash(relative(target, template)) || ".";
  const replacements: Readonly<Record<string, string>> = {
    "__NAME__": cfg.name,
    "__REPO__": cfg.repo,
    "__OWNER__": owner,
    "__REPO_NAME__": repo,
    "__BASE__": base(cfg.base),
    "__TEMPLATE__": templatePath.startsWith(".") ? templatePath : `./${templatePath}`,
    "__THEME_KEY__": `${slug(cfg.name)}.theme`,
    "__KOFI__": cfg.kofi ? kofiBlock(cfg.kofi) : ""
  };

  const glob = new Bun.Glob("**/*.{ts,html,css,md,yml,json}");
  for await (const path of glob.scan({ cwd: target, onlyFiles: true })) {
    const file = resolve(target, path);
    let text = await readFile(file, "utf8");
    for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(key, value);
    await writeFile(file, text, "utf8");
  }
};

const splitRepo = (value: string): readonly [string, string] => {
  const parts = value.split("/");
  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo || parts.length !== 2) throw new Error("--repo must use owner/repo format.");
  return [owner, repo];
};

const base = (value: string): string => {
  const start = value.startsWith("/") ? value : `/${value}`;
  return start.endsWith("/") ? start : `${start}/`;
};

const slug = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "pages";

const kofiBlock = (user: string): string => `\n    kofi: {\n      user: ${JSON.stringify(user)},\n      header: "[data-pages-header]",\n      footer: "[data-pages-footer-links]"\n    },`;
