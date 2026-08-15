import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const textExt = new Set([".ts", ".md", ".html", ".css", ".svg", ".json"]);
const staleRepoSlug = "braille-art-maker";

const files = async (path: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const next = join(path, entry.name);
    if (entry.isDirectory()) out.push(...await files(next));
    else if (textExt.has(extname(entry.name))) out.push(next);
  }
  return out;
};

test("owned product code and documentation consistently use Studio", async () => {
  const paths = [
    ...await files(join(root, "src")),
    ...await files(join(root, "web")),
    ...await files(join(root, "docs")),
    join(root, "README.md"),
    join(root, "package.json"),
    join(root, "pages.config.ts"),
  ];
  const stale: string[] = [];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    if (/\bmaker\b/iu.test(source) || source.includes("unicode-art-maker") || source.includes(staleRepoSlug)) stale.push(relative(root, path));
  }
  expect(stale).toEqual([]);
});

test("Studio implementation files are canonical in the owned tree", async () => {
  const owned = [...await files(join(root, "src")), ...await files(join(root, "web"))].map(path => relative(root, path));
  expect(owned).not.toContain(["src", "web", "maker.ts"].join("/"));
  expect(owned).not.toContain(["web", "styles", "maker.css"].join("/"));
  expect(owned).toContain("src/web/studio.ts");
  expect(owned).toContain("web/styles/studio.css");
});
