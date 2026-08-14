import type { Art, CellColour, Rgb } from "../types.ts";
import { rgbHex } from "../colour/space.ts";
import { exactBrailleFont, type BrailleFontFit } from "./braille-font.ts";

interface DenseSource {
  readonly colours?: readonly CellColour[];
  readonly lines: readonly string[];
  readonly columns: number;
  readonly rows: number;
}

interface DenseState {
  readonly source: DenseSource;
  mode: "cells" | "rows" | null;
  family: string | null;
  rendering: boolean;
  generation: number;
}

const compactAbove = 256;
const state = new WeakMap<HTMLElement, DenseState>();

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

const nextFrame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));

const renderInterlaced = async (
  host: HTMLElement,
  current: DenseState,
  fit: BrailleFontFit | null,
): Promise<void> => {
  const generation = ++current.generation;
  current.rendering = true;
  const rows = rowShells(host, current.source.rows);
  const compact = fit !== null;
  const defaultFg = getComputedStyle(host).color || "#201d24";
  const batch = compact ? 12 : Math.max(1, Math.floor(2048 / current.source.columns));

  host.dataset.unicodeRender = compact ? "rows" : "cells";
  if (fit) host.style.fontFamily = fit.family;
  else host.style.removeProperty("font-family");

  try {
    // Interlaced progressive final render: first populate even rows across the whole image,
    // then fill the odd rows. Every node belongs to the final target-resolution result;
    // no intermediate-resolution image is computed or discarded.
    for (const parity of [0, 1] as const) {
      let sinceYield = 0;
      for (let y = parity; y < current.source.rows; y += 2) {
        if (state.get(host) !== current || current.generation !== generation) return;
        const row = rows[y]!;
        if (fit) fillCompactRow(row, current.source, y, defaultFg);
        else fillCellRow(row, current.source, y);
        sinceYield += 1;
        if (sinceYield >= batch) {
          sinceYield = 0;
          await nextFrame();
        }
      }
      await nextFrame();
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
  const mode: "cells" | "rows" = fit ? "rows" : "cells";
  const family = fit?.family ?? null;

  if (allowRender && !current.rendering && (current.mode !== mode || (mode === "rows" && current.family !== family))) {
    if (fit) renderRows(host, current.source, fit);
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
  const mode: "cells" | "rows" = fit ? "rows" : "cells";
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
