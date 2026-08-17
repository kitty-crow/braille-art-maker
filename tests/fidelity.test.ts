import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string): Promise<string> => readFile(join(root, path), "utf8");

test("compact studio rows are forbidden through the stable 256-cell range", async () => {
  const dense = await read("src/web/dense.ts");
  const css = await read("web/styles/unicode.css");
  expect(dense).toContain("const compactAbove = 256;");
  expect(dense).toContain("if (next.columns <= compactAbove)");
  expect(dense).toContain("renderCells(host, next);");
  expect(dense).toContain("const fit = columns > compactAbove ? exactBrailleFont(host, target) : null;");
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

test("very-high-resolution studio fallback bounds live DOM with seam-free fixed Unicode chunks", async () => {
  const dense = await read("src/web/dense.ts");
  const css = await read("web/styles/unicode.css");
  expect(dense).toContain("const chunkAbove = 768;");
  expect(dense).toContain("const chunkCells = 8;");
  expect(dense).toContain("const chunkCellsFor = (columns: number): number =>");
  expect(dense).toContain('type DenseMode = "cells" | "rows" | "chunks";');
  expect(dense).toContain('return columns > chunkAbove ? "chunks" : "cells";');
  expect(dense).toContain('chunk.className = "unicode-chunk";');
  expect(dense).toContain('backdrop.className = "unicode-row-bg";');
  expect(dense).toContain("chunk.style.left = `calc(${x} * var(--cell-w))`;");
  expect(dense).toContain("chunk.style.width = `calc(${count} * var(--cell-w))`;");
  expect(dense).not.toContain("chunk.style.gridColumn");
  expect(dense).toContain("fillChunkRow(row, current.source, y, defaultFg)");
  expect(dense).toContain('host.dataset.unicodeRender = "chunks";');
  expect(css).toContain('.unicode-grid[data-unicode-render="chunks"] .unicode-row{display:block;position:relative;');
  expect(css).toContain(".unicode-row-bg{position:absolute;");
  expect(css).toContain(".unicode-chunk{position:absolute;");
});

test("studio high-resolution rendering is cooperative, interlaced and never artificially frame-throttled", async () => {
  const dense = await read("src/web/dense.ts");
  expect(dense).toContain("const paintBudgetMs = 12;");
  expect(dense).toContain("for (const parity of [0, 1] as const)");
  expect(dense).toContain("for (let y = parity; y < current.source.rows; y += 2)");
  expect(dense).toContain("performance.now() - sliceStart >= paintBudgetMs");
  expect(dense).toContain("await yieldBrowser();");
  expect(dense).toContain("scheduler?.yield");
  expect(dense).toContain("taskChannel.port2.postMessage(0)");
  expect(dense).not.toContain("await nextFrame();");
  expect(dense).not.toContain("requestAnimationFrame(() => resolve())");
  expect(dense).not.toContain("const batch =");
  expect(dense).toContain("rowShells(host, current.source.rows)");
  expect(dense).toContain("fillCompactRow(row, current.source, y, defaultFg)");
  expect(dense).toContain("fillChunkRow(row, current.source, y, defaultFg)");
  expect(dense).toContain("fillCellRow(row, current.source, y)");
  expect(dense).not.toContain("makeArt(");
});

test("embed runtime has the same proof gate and unthrottled progressive exact rendering fallback", async () => {
  const runtime = await read("src/embed/runtime.ts");
  const css = await read("templates/embed/embed.css");
  expect(runtime).toContain("const compactAbove = 256;");
  expect(runtime).toContain("const paintBudgetMs = 12;");
  expect(runtime).toContain("this.compactAllowed = legacy === null;");
  expect(runtime).toContain("this.compactAllowed && payload.columns > compactAbove ? exactBrailleFont(this.grid, target) : null");
  expect(runtime).toContain("for (const parity of [0, 1] as const)");
  expect(runtime).toContain("for (let y = parity; y < payload.rows; y += 2)");
  expect(runtime).toContain("performance.now() - sliceStart >= paintBudgetMs");
  expect(runtime).toContain("await yieldBrowser();");
  expect(runtime).not.toContain("await nextFrame();");
  expect(runtime).not.toContain("const batch =");
  expect(runtime).toContain('cell.className = "cell";');
  expect(css).toContain("grid-template-columns: repeat(var(--cols), var(--cell));");
  expect(css).toContain('.grid[data-unicode-render="rows"] .row');
});

test("high-resolution u4 avoids the unsafe ultra candidate family in both Compact payload modes", async () => {
  const search = await read("src/embed/ultra-search.ts");
  expect(search).toContain("const fullSearchColumns = 256;");
  expect(search).toContain("if (art.columns > fullSearchColumns) return packStoryBounded(art, cfg, brotli, progress);");
  expect(search).toContain("if (art.columns > fullSearchColumns) return packCompactBounded(art, cfg, brotli, progress);");
  expect(search).toContain("const candidates = packRawV2Candidates(art, cfg);");
  expect(search).not.toContain("readonly deflated:");
});

test("high-resolution browser encoding transfers one bounded raw buffer instead of cloning Art", async () => {
  const web = await read("src/web/embed.ts");
  const raw = await read("src/embed/bounded-raw.ts");
  const worker = await read("src/web/embed-worker.ts");
  expect(web).toContain("const transferAbove = 256;");
  expect(web).toContain("const raw = preparedRaw ?? packBoundedRaw(art, cfg);");
  expect(web).toContain("[raw.buffer as ArrayBuffer]");
  expect(web).toContain("const oneShot = shouldTransferEmbedRaw(art.columns, cfg, story);");
  expect(web).toContain("columns >= transferAbove || (story && cfg.fullColour === true)");
  expect(web).toContain("if (wait.oneShot && pending.size === 0) disposeWorker();");
  expect(web).toContain("{ id, raw, cfg, theme, surface, story }");
  expect(raw).toContain("const chunkSize = 64 * 1024;");
  expect(raw).toContain("export const packBoundedRaw");
  expect(worker).toContain("packRawEmbedSmall");
  expect(worker).toContain("request.story");
});

test("high-resolution preview finishes before embed compression starts", async () => {
  const studio = await read("src/web/studio.ts");
  const renderAt = studio.indexOf("await renderDense(output, next);");
  const embedAt = studio.indexOf("scheduleEmbed(next, cfg, embedLocal, id");
  expect(renderAt).toBeGreaterThan(-1);
  expect(embedAt).toBeGreaterThan(renderAt);
  expect(studio).toContain("cancelEmbedHtml();");
  expect(studio).toContain("Generating high-resolution art…");
});

test("resolution input commits rendering only after interaction settles", async () => {
  const gate = await read("src/web/resolution.ts");
  expect(gate).toContain("const commitSlider = (): void =>");
  expect(gate).toContain('input.addEventListener("change", commitSlider);');
  expect(gate).toContain('valueInput.addEventListener("change", commitManual);');
  expect(gate).toContain('valueInput.addEventListener("blur", commitManual);');
  expect(gate).toContain('if (event.key !== "Enter") return;');
  expect(gate).toContain("commitManual();");
  const inputHandler = gate.match(/input\.addEventListener\("input", \(\) => \{([\s\S]*?)\n  \}\);/u)?.[1] ?? "";
  expect(inputHandler).not.toContain("onCommit()");
  const numericHandler = gate.match(/valueInput\.addEventListener\("input", \(\) => \{([\s\S]*?)\n  \}\);/u)?.[1] ?? "";
  expect(numericHandler).not.toContain("onCommit()");
});

test("resolution gates include 765 and 1K jokes while manual values remain unbounded", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  const gate = await read("src/web/resolution.ts");
  const size = await read("src/core/size.ts");
  const art = await read("src/core/art.ts");
  expect(html).toContain('id="columns" type="range" min="24" max="2048"');
  expect(html).toContain('id="columns-value" class="resolution-value" type="number" min="24" step="1"');
  expect(html).not.toContain('id="columns-value" class="resolution-value" type="number" min="24" max=');
  expect(gate).toContain('value: 765');
  expect(gate).toContain('Beyond here, any-nyan ventures at their own risk.');
  expect(gate).toContain('value: 1024');
  expect(gate).toContain('1K? Are nya crazy?! I’d hate to be your RAM right meow!');
  expect(gate).toContain("const normaliseManual = (value: number): number => Math.max(min, Math.round(value));");
  expect(gate).toContain("opts.confirmAboveMax(next, max)");
  expect(studio).toContain("const resolutionMax = 2048;");
  expect(studio).toContain('columnsValue.removeAttribute("max");');
  expect(studio).toContain("columns: Number(columnsValue.value)");
  expect(studio).toContain("2K was the last stop. Are nya sure you want to keep going?");
  expect(studio).toContain("This is unsupported and may crash the tab.");
  expect(size).toContain("export const maxColumns = 2048;");
  expect(size).not.toContain("Math.min(maxColumns");
  expect(art).not.toContain("Math.min(maxColumns");
  expect(art).not.toContain("artSize, maxColumns, minColumns");
});

test("all source pages preserve the mobile viewport contract", async () => {
  const expected = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">';
  for (const path of ["web/index.html", "web/about/index.html", "web/readme/index.html", "web/404.html"]) {
    expect(await read(path)).toContain(expected);
  }
});
