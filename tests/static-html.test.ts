import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { staticArtHtml } from "../src/embed/static-html.ts";
import type { Art } from "../src/types.ts";

const root = join(import.meta.dir, "..");

const art: Art = {
  text: "⣿⠿\n⣶⣤",
  columns: 2,
  rows: 2,
  dotsWidth: 4,
  dotsHeight: 8,
  threshold: 0.5,
  density: 0.5,
};

test("static art embed is self-contained HTML with inline CSS and no JavaScript or fetching", () => {
  const html = staticArtHtml(art, {});
  expect(html).toContain('role="img"');
  expect(html).toContain("⣿⠿");
  expect(html).toContain("container-type:inline-size");
  expect(html).not.toMatch(/<script\b/iu);
  expect(html).not.toMatch(/<link\b/iu);
  expect(html).not.toMatch(/\bsrc=/iu);
  expect(html).not.toMatch(/\bhref=/iu);
  expect(html).not.toMatch(/url\s*\(/iu);
  expect(html).not.toMatch(/https?:/iu);
});

test("static colour embed keeps foreground and background colours inline", () => {
  const colour: Art = {
    ...art,
    cellColours: [
      { fg: { r: 255, g: 0, b: 0 }, bg: { r: 0, g: 0, b: 0 } },
      { fg: { r: 255, g: 0, b: 0 }, bg: { r: 0, g: 0, b: 0 } },
      { fg: { r: 0, g: 255, b: 0 } },
      { fg: { r: 0, g: 0, b: 255 } },
    ],
  };
  const html = staticArtHtml(colour, { colour: true, colourBackground: true, fullColour: true });
  expect(html).toContain("color:#ff0000");
  expect(html).toContain("background:#000000");
  expect(html).toContain("color:#00ff00");
  expect(html).toContain("color:#0000ff");
  expect(html).not.toMatch(/<script\b/iu);
});

test("embed code view exposes Compact and No JavaScript tabs and lazily decodes static output", async () => {
  const view = await readFile(join(root, "src", "web", "embed-view.ts"), "utf8");
  expect(view).toContain('this.tab("Compact", "compact", true)');
  expect(view).toContain('this.tab("No JavaScript", "static", false)');
  expect(view).toContain("unpackEmbedSmall");
  expect(view).toContain("staticArtHtml");
  expect(view).toContain('if (this.mode !== "static") return;');
  expect(view).toContain("event.stopImmediatePropagation();");
  expect(view).toContain("Building self-contained HTML…");
});
