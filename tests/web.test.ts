import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("hero starts at a vertical 50 percent split", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const css = await readFile(join(root, "web", "styles", "hero.css"), "utf8");
  expect(html).toContain('id="compare" style="--split:50%"');
  expect(css).toContain("top:0;"); expect(css).toContain("bottom:0;"); expect(css).toContain("left:var(--split);"); expect(css).toContain("clip-path:inset(0 0 0 var(--split));");
});

test("ordered dithering and inverted polarity are the defaults", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const art = await readFile(join(root, "src", "core", "art.ts"), "utf8");
  const args = await readFile(join(root, "src", "cli", "args.ts"), "utf8");
  expect(html).toContain('<option value="ordered" selected>'); expect(html).toContain('id="invert" type="checkbox" checked');
  expect(art).toContain('cfg.invert ?? true'); expect(art).toContain('cfg.dither ?? "ordered"');
  expect(args).toContain('value("--dither") ?? "ordered"'); expect(args).toContain('!args.includes("--no-invert")');
});

test("hero is full colour by default while maker colour is opt in", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  expect(html).toContain('id="hero-colour" type="checkbox" checked');
  expect(html).toContain('id="hero-background" type="checkbox" checked');
  expect(html).toContain('id="hero-full-colour" type="checkbox" checked');
  expect(html).toContain('id="colour" type="checkbox"> Colour output');
  expect(html).toContain('id="colour-background" type="checkbox" checked');
  expect(html).toContain('id="full-colour" type="checkbox" checked');
  expect(maker).toContain('fullColour: heroColour.checked && heroBg.checked && heroFull.checked');
});

test("README is linked from the footer", async () => {
  const home = await readFile(join(root, "web", "index.html"), "utf8");
  const about = await readFile(join(root, "web", "about", "index.html"), "utf8");
  const readme = await readFile(join(root, "web", "readme", "index.html"), "utf8");
  expect(home).toContain('<span class="footer__links"><a href="readme/">README</a>');
  expect(about).toContain('<a href="../readme/">README</a>');
  expect(readme).toContain('<a href="./" aria-current="page">README</a>');
});

test("styles are split by concern and headings stay restrained", async () => {
  const index = await readFile(join(root, "web", "styles.css"), "utf8");
  const hero = await readFile(join(root, "web", "styles", "hero.css"), "utf8");
  expect(index).toContain('@import url("./styles/hero.css");'); expect(hero).toContain("3.35rem"); expect(hero).not.toContain("7.5rem");
});

test("README uses the shared markdown runtime and Ko-fi integration", async () => {
  const config = await readFile(join(root, "pages.config.ts"), "utf8");
  const html = await readFile(join(root, "web", "readme", "index.html"), "utf8");
  expect(config).toContain('files: ["kofi.css"]'); expect(config).toContain('user: "kittycrow"'); expect(config).toContain('repo: "braille-art-maker"');
  expect(html).toContain('id="readme-content" class="panel markdown"'); expect(html).toContain('id="readme-status" class="sr-only"');
});

test("preview display fits both available width and height", async () => {
  const dense = await readFile(join(root, "src", "web", "dense.ts"), "utf8");
  const css = await readFile(join(root, "web", "styles", "maker.css"), "utf8");
  expect(dense).toContain("Math.min(width / columns, height / (rows * 2))"); expect(dense).toContain('parent?.classList.contains("preview-scroll")');
  expect(css).toContain("height:min(70dvh,720px)"); expect(css).toContain("overflow:hidden");
});
