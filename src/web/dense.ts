import type { Art, CellColour, Rgb } from "../types.ts";
import { rgbHex } from "../colour/space.ts";
import { exactBrailleFont, type BrailleFontFit } from "./braille-font.ts";

interface DenseSource {
  readonly colours?: readonly CellColour[];
  readonly lines: readonly string[];
  readonly columns: number;
  readonly rows: number;
}

type DenseMode = "cells" | "rows" | "chunks";

interface DenseState {
  readonly source: DenseSource;
  mode: DenseMode | null;
  family: string | null;
  rendering: boolean;
  generation: number;
}

const compactAbove = 256;
const chunkAbove = 768;
const chunkCells = 8;
const paintBudgetMs = 12;
const state = new WeakMap<HTMLElement, DenseState>();
const taskChannel = typeof MessageChannel === "undefined" ? null : new MessageChannel();
const taskQueue: Array<() => void> = [];
if (taskChannel) taskChannel.port1.onmessage = () => taskQueue.shift()?.();

const yieldBrowser = (): Promise<void> => {
  const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  if (taskChannel) return new Promise(resolve => { taskQueue.push(resolve); taskChannel.port2.postMessage(0); });
  return new Promise(resolve => setTimeout(resolve, 0));
};

const innerSize = (element: HTMLElement): { width: number; height: number } => {
  const style = getComputedStyle(element);
  const px = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const py = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return { width: Math.max(0, element.clientWidth - px), height: Math.max(0, element.clientHeight - py) };
};

const frameFor = (host: HTMLElement): HTMLElement => {
  const parent = host.parentElement;
  if (parent?.classList.contains("preview-scroll") || parent?.classList.contains("compare-after")) return parent;
  return host;
};

const targetFor = (host: HTMLElement, columns: number, rows: number): number => {
  const { width, height } = innerSize(frameFor(host));
  if (!width || !height) return 0;
  return Math.min(width / columns, height / (rows * 2));
};

const legacyFont = (host: HTMLElement, target: number): number => {
  const probe = document.createElement("span");
  probe.textContent = "⣿".repeat(100);
  probe.className = "unicode-probe";
  probe.style.fontSize = "100px";
  host.appendChild(probe);
  const natural = probe.getBoundingClientRect().width / 100 || 60;
  probe.remove();
  return 100 * target / natural;
};

const sameRgb = (a?: Rgb, b?: Rgb): boolean => (!a && !b) || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b);
const cssRgb = (rgb: Rgb | undefined, fallback: string): string => rgb ? rgbHex(rgb) : fallback;
const pct = (index: number, columns: number): string => `${Number((index * 100 / columns).toFixed(6))}%`;

const gradient = (
  colours: readonly CellColour[] | undefined,
  offset: number,
  columns: number,
  background: boolean,
  fallback: string,
): string | null => {
  if (!colours || columns < 1) return null;
  const rgbAt = (x: number): Rgb | undefined => background ? colours[offset + x]?.bg : colours[offset + x]?.fg;
  let explicit = false;
  const stops: string[] = [];
  let start = 0;
  while (start < columns) {
    const rgb = rgbAt(start);
    if (rgb) explicit = true;
    let end = start + 1;
    while (end < columns && sameRgb(rgb, rgbAt(end))) end += 1;
    const colour = cssRgb(rgb, fallback);
    stops.push(`${colour} ${pct(start, columns)}`, `${colour} ${pct(end, columns)}`);
    start = end;
  }
  return explicit ? `linear-gradient(to right,${stops.join(",")})` : null;
};

const stringColumns = (lines: readonly string[]): number => {
  let columns = 1;
  for (const line of lines) columns = Math.max(columns, [...line].length);
  return columns;
};

const sourceOf = (source: string | Art): DenseSource => {
  const text = typeof source === "string" ? source : source.text;
  const lines = text.split("\n");
  return {
    lines,
    columns: typeof source === "string" ? stringColumns(lines) : source.columns,
    rows: typeof source === "string" ? Math.max(1, lines.length) : source.rows,
    ...(typeof source === "string" || !source.cellColours ? {} : { colours: source.cellColours }),
  };
};

const paint = (cell: HTMLElement, colour?: CellColour): void => {
  if (colour?.fg) cell.style.color = rgbHex(colour.fg);
  if (colour?.bg) cell.style.backgroundColor = rgbHex(colour.bg);
};

const padded = (source: DenseSource, y: number): string => [...(source.lines[y] ?? "").padEnd(source.columns, "⠀")].slice(0, source.columns).join("");

const fillCellRow = (row: HTMLElement, source: DenseSource, y: number): void => {
  const fragment = document.createDocumentFragment();
  let x = 0;
  for (const char of padded(source, y)) {
    const cell = document.createElement("span");
    cell.className = "unicode-cell";
    cell.textContent = char;
    paint(cell, source.colours?.[y * source.columns + x]);
    fragment.appendChild(cell);
    x += 1;
  }
  row.replaceChildren(fragment);
};

const fillCompactRow = (row: HTMLElement, source: DenseSource, y: number, defaultFg: string): void => {
  const text = padded(source, y);
  if (!source.colours) {
    row.textContent = text;
    return;
  }

  const offset = y * source.columns;
  const bg = gradient(source.colours, offset, source.columns, true, "transparent");
  const fg = gradient(source.colours, offset, source.columns, false, defaultFg);
  if (bg) row.style.backgroundImage = bg;
  const ink = document.createElement("span");
  ink.className = fg ? "unicode-ink unicode-ink-colour" : "unicode-ink";
  ink.textContent = text;
  if (fg) ink.style.backgroundImage = fg;
  row.replaceChildren(ink);
};

const fillChunkRow = (row: HTMLElement, source: DenseSource, y: number, defaultFg: string): void => {
  const chars = [...padded(source, y)];
  const fragment = document.createDocumentFragment();

  if (source.colours) {
    const bg = gradient(source.colours, y * source.columns, source.columns, true, "transparent");
    if (bg) {
      const backdrop = document.createElement("span");
      backdrop.className = "unicode-row-bg";
      backdrop.style.backgroundImage = bg;
      fragment.appendChild(backdrop);
    }
  }

  for (let x = 0; x < source.columns; x += chunkCells) {
    const count = Math.min(chunkCells, source.columns - x);
    const chunk = document.createElement("span");
    chunk.className = "unicode-chunk";
    chunk.style.left = `calc(${x} * var(--cell-w))`;
    chunk.style.width = `calc(${count} * var(--cell-w))`;
    const text = chars.slice(x, x + count).join("");
    if (!source.colours) {
      chunk.textContent = text;
      fragment.appendChild(chunk);
      continue;
    }

    const offset = y * source.columns + x;
    const fg = gradient(source.colours, offset, count, false, defaultFg);
    const ink = document.createElement("span");
    ink.className = fg ? "unicode-ink unicode-ink-colour" : "unicode-ink";
    ink.textContent = text;
    if (fg) ink.style.backgroundImage = fg;
    chunk.appendChild(ink);
    fragment.appendChild(chunk);
  }
  row.replaceChildren(fragment);
};

const rowShells = (host: HTMLElement, rows: number): HTMLElement[] => {
  const fragment = document.createDocumentFragment();
  const out: HTMLElement[] = [];
  for (let y = 0; y < rows; y += 1) {
    const row = document.createElement("div");
    row.className = "unicode-row";
    out.push(row);
    fragment.appendChild(row);
  }
  host.replaceChildren(fragment);
  return out;
};

const renderCells = (host: HTMLElement, source: DenseSource): void => {
  const rows = rowShells(host, source.rows);
  for (let y = 0; y < source.rows; y += 1) fillCellRow(rows[y]!, source, y);
  host.dataset.unicodeRender = "cells";
  host.style.removeProperty("font-family");
};

const renderRows = (host: HTMLElement, source: DenseSource, fit: BrailleFontFit): void => {
  const rows = rowShells(host, source.rows);
  const defaultFg = getComputedStyle(host).color || "#201d24";
  for (let y = 0; y < source.rows; y += 1) fillCompactRow(rows[y]!, source, y, defaultFg);
  host.dataset.unicodeRender = "rows";
  host.style.fontFamily = fit.family;
};

const renderChunks = (host: HTMLElement, source: DenseSource): void => {
  const rows = rowShells(host, source.rows);
  const defaultFg = getComputedStyle(host).color || "#201d24";
  for (let y = 0; y < source.rows; y += 1) fillChunkRow(rows[y]!, source, y, defaultFg);
  host.dataset.unicodeRender = "chunks";
  host.style.removeProperty("font-family");
};

const modeFor = (columns: number, fit: BrailleFontFit | null): DenseMode => {
  if (fit) return "rows";
  return columns > chunkAbove ? "chunks" : "cells";
};

const renderInterlaced = async (
  host: HTMLElement,
  current: DenseState,
  fit: BrailleFontFit | null,
): Promise<void> => {
  const generation = ++current.generation;
  current.rendering = true;
  const rows = rowShells(host, current.source.rows);
  const mode = modeFor(current.source.columns, fit);
  const defaultFg = getComputedStyle(host).color || "#201d24";
  let sliceStart = performance.now();

  host.dataset.unicodeRender = mode;
  if (fit) host.style.fontFamily = fit.family;
  else host.style.removeProperty("font-family");

  try {
    for (const parity of [0, 1] as const) {
      for (let y = parity; y < current.source.rows; y += 2) {
        if (state.get(host) !== current || current.generation !== generation) return;
        const row = rows[y]!;
        if (mode === "rows") fillCompactRow(row, current.source, y, defaultFg);
        else if (mode === "chunks") fillChunkRow(row, current.source, y, defaultFg);
        else fillCellRow(row, current.source, y);
        if (performance.now() - sliceStart >= paintBudgetMs) {
          await yieldBrowser();
          sliceStart = performance.now();
        }
      }
    }
  } finally {
    if (state.get(host) === current && current.generation === generation) current.rendering = false;
  }
};

const applyGeometry = (host: HTMLElement, current: DenseState, allowRender: boolean): BrailleFontFit | null => {
  const columns = current.source.columns;
  const rows = current.source.rows;
  const target = targetFor(host, columns, rows);
  if (!(target > 0)) return null;

  const fit = columns > compactAbove ? exactBrailleFont(host, target) : null;
  const mode = modeFor(columns, fit);
  const family = fit?.family ?? null;

  if (allowRender && !current.rendering && (current.mode !== mode || (mode === "rows" && current.family !== family))) {
    if (mode === "rows" && fit) renderRows(host, current.source, fit);
    else if (mode === "chunks") renderChunks(host, current.source);
    else renderCells(host, current.source);
    current.mode = mode;
    current.family = family;
  }

  const fontPx = fit?.fontPx ?? legacyFont(host, target);
  host.style.setProperty("--cell-w", `${target}px`);
  host.style.setProperty("--cell-h", `${target * 2}px`);
  host.style.setProperty("--unicode-font", `${fontPx}px`);
  host.style.width = `${columns * target}px`;
  host.style.height = `${rows * target * 2}px`;
  return fit;
};

export const fitDense = (host: HTMLElement): void => {
  const current = state.get(host);
  if (!current) return;
  applyGeometry(host, current, true);
};

export const renderDense = async (host: HTMLElement, source: string | Art): Promise<void> => {
  const next = sourceOf(source);
  const current: DenseState = { source: next, mode: null, family: null, rendering: false, generation: 0 };
  state.set(host, current);
  host.replaceChildren();
  host.style.setProperty("--cols", String(next.columns));
  host.style.setProperty("--rows", String(next.rows));

  const fit = applyGeometry(host, current, false);
  const mode = modeFor(next.columns, fit);
  current.mode = mode;
  current.family = fit?.family ?? null;

  if (next.columns <= compactAbove) {
    renderCells(host, next);
    applyGeometry(host, current, false);
    return;
  }

  await renderInterlaced(host, current, fit);
  if (state.get(host) === current) applyGeometry(host, current, true);
};
