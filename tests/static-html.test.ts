import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { staticArtHtml, staticPackedHtml } from "../src/embed/static-html.ts";
import type { PackedEmbed } from "../src/embed/codec.ts";
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
  expect(html).toContain("aspect-ratio:1");
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
  expect(html).toContain("#ff0000");
  expect(html).toContain("#000000");
  expect(html).toContain("#00ff00");
  expect(html).toContain("#0000ff");
  expect(html).toContain("linear-gradient(to right");
  expect(html).not.toMatch(/<script\b/iu);
});

test("dense full-colour static output is row-bounded rather than one span per cell", () => {
  const columns = 512;
  const rows = 256;
  const cells = columns * rows;
  const packed: PackedEmbed = {
    columns,
    rows,
    masks: Uint8Array.from({ length: cells }, (_, index) => index & 0xff),
    colour: true,
    colourBackground: true,
    fullColour: true,
    cellColours: Array.from({ length: cells }, (_, index) => ({
      fg: { r: index & 0xff, g: index * 3 & 0xff, b: index * 7 & 0xff },
      bg: { r: index * 11 & 0xff, g: index * 13 & 0xff, b: index * 17 & 0xff },
    })),
  };
  const html = staticPackedHtml(packed);
  expect((html.match(/<span\b/gu) ?? []).length).toBe(rows);
  expect((html.match(/linear-gradient\(to right/gu) ?? []).length).toBe(rows * 2);
  expect(html).toContain("width:min(100%,40rem);aspect-ratio:1");
});

test("static geometry uses the same square-host limiting axis as compact runtime", () => {
  const tall: Art = {
    ...art,
    text: "⣿⣿\n⣿⣿\n⣿⣿\n⣿⣿",
    rows: 4,
    dotsHeight: 16,
  };
  const html = staticArtHtml(tall, {});
  // max(columns=2, rows*2=8) => 160/8 = 20cqw font and 200/8 = 25cqw line height.
  expect(html).toContain("font-size:20.00000000cqw");
  expect(html).toContain("line-height:25.00000000cqw");
});

test("embed code view exposes Compact and No JavaScript tabs and decodes directly to static packed HTML", async () => {
  const view = await readFile(join(root, "src", "web", "embed-view.ts"), "utf8");
  expect(view).toContain('this.tab("Compact", "compact", true)');
  expect(view).toContain('this.tab("No JavaScript", "static", false)');
  expect(view).toContain("unpackEmbedSmall");
  expect(view).toContain("staticPackedHtml(decoded)");
  expect(view).toContain('if (this.mode !== "static") return;');
  expect(view).toContain("event.stopImmediatePropagation();");
  expect(view).toContain("Building self-contained HTML…");
});
