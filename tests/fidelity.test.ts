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

test("very-high-resolution maker fallback bounds live DOM with fixed Unicode chunks", async () => {
  const dense = await read("src/web/dense.ts");
  const css = await read("web/styles/unicode.css");
  expect(dense).toContain("const chunkAbove = 768;");
  expect(dense).toContain("const chunkCells = 8;");
  expect(dense).toContain('type DenseMode = "cells" | "rows" | "chunks";');
  expect(dense).toContain('return columns > chunkAbove ? "chunks" : "cells";');
  expect(dense).toContain('chunk.className = "unicode-chunk";');
  expect(dense).toContain("chunk.style.gridColumn = `span ${count}`;");
  expect(dense).toContain("fillChunkRow(row, current.source, y, defaultFg)");
  expect(dense).toContain('host.dataset.unicodeRender = "chunks";');
  expect(css).toContain('.unicode-grid[data-unicode-render="chunks"] .unicode-row');
  expect(css).toContain(".unicode-chunk{");
});

test("maker high-resolution rendering is cooperative, interlaced and never artificially frame-throttled", async () => {
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

test("high-resolution u4 avoids the unsafe ultra candidate family", async () => {
  const search = await read("src/embed/ultra-search.ts");
  expect(search).toContain("const fullSearchColumns = 256;");
  expect(search).toContain("if (art.columns > fullSearchColumns) return packBounded(art, cfg, brotli, progress);");
  expect(search).toContain("const candidates = packRawV2Candidates(art, cfg);");
  expect(search).not.toContain("readonly deflated:");
});

test("high-resolution browser encoding transfers one bounded raw buffer instead of cloning Art", async () => {
  const web = await read("src/web/embed.ts");
  const raw = await read("src/embed/bounded-raw.ts");
  const worker = await read("src/web/embed-worker.ts");
  expect(web).toContain("const transferAbove = 256;");
  expect(web).toContain("const raw = packBoundedRaw(art, cfg);");
  expect(web).toContain("[raw.buffer as ArrayBuffer]");
  expect(web).toContain("const oneShot = art.columns > transferAbove;");
  expect(web).toContain("if (wait.oneShot && pending.size === 0) disposeWorker();");
  expect(raw).toContain("const chunkSize = 64 * 1024;");
  expect(raw).toContain("export const packBoundedRaw");
  expect(worker).toContain("packRawEmbedSmall");
});

test("high-resolution preview finishes before embed compression starts", async () => {
  const maker = await read("src/web/maker.ts");
  const renderAt = maker.indexOf("await renderDense(output, next);");
  const embedAt = maker.indexOf("scheduleEmbed(next, cfg, embedLocal);");
  expect(renderAt).toBeGreaterThan(-1);
  expect(embedAt).toBeGreaterThan(renderAt);
  expect(maker).toContain("cancelEmbedHtml();");
  expect(maker).toContain("Generating high-resolution art…");
});

test("resolution input commits rendering only after interaction settles", async () => {
  const gate = await read("src/web/resolution.ts");
  expect(gate).toContain("const commit = (): void =>");
  expect(gate).toContain('input.addEventListener("change", commit);');
  expect(gate).toContain('valueInput.addEventListener("change", commitManual);');
  expect(gate).toContain('valueInput.addEventListener("blur", commitManual);');
  expect(gate).toContain('if (event.key !== "Enter") return;');
  expect(gate).toContain("commit();");
  const inputHandler = gate.match(/input\.addEventListener\("input", \(\) => \{([\s\S]*?)\n  \}\);/u)?.[1] ?? "";
  expect(inputHandler).not.toContain("onCommit()");
  const numericHandler = gate.match(/valueInput\.addEventListener\("input", \(\) => \{([\s\S]*?)\n  \}\);/u)?.[1] ?? "";
  expect(numericHandler).not.toContain("onCommit()");
});

test("all source pages preserve the mobile viewport contract", async () => {
  const expected = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">';
  for (const path of ["web/index.html", "web/about/index.html", "web/readme/index.html", "web/404.html"]) {
    expect(await read(path)).toContain(expected);
  }
});
