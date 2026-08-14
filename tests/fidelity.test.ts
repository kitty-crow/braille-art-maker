import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string): Promise<string> => readFile(join(root, path), "utf8");

test("compact maker rows are forbidden through the stable 256-cell range", async () => {
  const dense = await read("src/web/dense.ts");
  const css = await read("web/styles/unicode.css");
  expect(dense).toContain("const compactAbove = 256;");
  expect(dense).toContain("if (next.columns <= compactAbove)");
  expect(dense).toContain("renderCells(host, next);");
  expect(dense).toContain("if (current && columns > compactAbove) fit = exactBrailleFont(host, target);");
  expect(dense).toContain('cell.className = "unicode-cell";');
  expect(dense).toContain('host.dataset.unicodeRender = "cells";');
  expect(dense).toContain('host.dataset.unicodeRender = "rows";');
  expect(css).toContain('.unicode-row{display:grid;grid-template-columns:repeat(var(--cols),var(--cell-w));');
  expect(css).toContain('.unicode-grid[data-unicode-render="rows"] .unicode-row{display:block;');
});

test("compact rows require exact geometry for all 256 Braille glyphs", async () => {
  const probe = await read("src/web/braille-font.ts");
  expect(probe).toContain("Array.from({ length: 256 }");
  expect(probe).toContain("for (let i = 0; i < 256; i += 1)");
  expect(probe).toContain("range.setStart(node, i);");
  expect(probe).toContain("range.setEnd(node, i + 1);");
  expect(probe).toContain("const expected = box.left + i * cellPx;");
  expect(probe).toContain("Math.abs(rect.left - expected) > tolerance");
  expect(probe).toContain("Math.abs(rect.width - cellPx) > tolerance");
  expect(probe).toContain("span.style.fontKerning = \"none\";");
  expect(probe).toContain("span.style.fontVariantLigatures = \"none\";");
  expect(probe).toContain("span.style.letterSpacing = \"0\";");
});

test("embed runtime has the same proof gate and preserves legacy exact rendering", async () => {
  const runtime = await read("src/embed/runtime.ts");
  const css = await read("templates/embed/embed.css");
  expect(runtime).toContain("const compactAbove = 256;");
  expect(runtime).toContain("this.compactAllowed = legacy === null;");
  expect(runtime).toContain("this.compactAllowed && this.payload.columns > compactAbove ? exactBrailleFont(this.grid, target) : null");
  expect(runtime).toContain("else this.renderCells(this.payload);");
  expect(runtime).toContain('cell.className = "cell";');
  expect(css).toContain("grid-template-columns: repeat(var(--cols), var(--cell));");
  expect(css).toContain('.grid[data-unicode-render="rows"] .row');
});

test("high-resolution u4 avoids the unsafe ultra candidate family", async () => {
  const search = await read("src/embed/ultra-search.ts");
  expect(search).toContain("const fullSearchColumns = 256;");
  expect(search).toContain("if (art.columns > fullSearchColumns) return packBounded(art, cfg, brotli, progress);");
  expect(search).toContain("const candidates = packRawV2Candidates(art, cfg);");
  expect(search).not.toContain("readonly deflated:");
});
