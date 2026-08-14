import type { Art, CellColour, Rgb } from "../types.ts";
import { rgbHex } from "../colour/space.ts";

const compactThreshold = 256;
const metricTolerance = 0.125;
const brailleProbe = Array.from({ length: 256 }, (_, mask) => String.fromCodePoint(0x2800 + mask)).join("");
const fontCandidates = [
  '"Apple Braille", monospace',
  '"Noto Sans Symbols 2", monospace',
  '"DejaVu Sans Mono", monospace',
  '"Cascadia Mono", monospace',
  '"Cascadia Code", monospace',
  '"Segoe UI Symbol", monospace',
  "monospace",
] as const;

interface BrailleMetric {
  readonly family: string;
  readonly advance100: number;
  readonly spread100: number;
}

let metricCache: BrailleMetric | null | undefined;

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

const measureFamily = (host: HTMLElement, family: string): BrailleMetric | null => {
  const probe = document.createElement("span");
  probe.className = "unicode-probe";
  probe.style.fontFamily = family;
  probe.style.fontSize = "100px";
  probe.textContent = brailleProbe;
  host.appendChild(probe);
  const node = probe.firstChild;
  if (!(node instanceof Text)) { probe.remove(); return null; }

  const range = document.createRange();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const width = range.getBoundingClientRect().width;
    if (!(width > 0)) { probe.remove(); return null; }
    min = Math.min(min, width);
    max = Math.max(max, width);
    sum += width;
  }
  probe.remove();
  return { family, advance100: sum / 256, spread100: max - min };
};

const compactMetric = (host: HTMLElement): BrailleMetric | null => {
  if (metricCache !== undefined) return metricCache;
  let best: BrailleMetric | null = null;
  for (const family of fontCandidates) {
    const metric = measureFamily(host, family);
    if (metric && (!best || metric.spread100 < best.spread100)) best = metric;
  }
  metricCache = best && best.spread100 <= metricTolerance ? best : null;
  return metricCache;
};

export const fitDense = (host: HTMLElement): void => {
  const columns = Number(host.style.getPropertyValue("--cols")) || 1;
  const rows = Number(host.style.getPropertyValue("--rows")) || 1;
  const { width, height } = innerSize(frameFor(host));
  if (!width || !height) return;
  const target = Math.min(width / columns, height / (rows * 2));
  let natural = Number(host.dataset.unicodeAdvance100);
  if (!(natural > 0)) {
    const probe = document.createElement("span");
    probe.textContent = "⣿".repeat(100);
    probe.className = "unicode-probe";
    probe.style.fontSize = "100px";
    host.appendChild(probe);
    natural = probe.getBoundingClientRect().width / 100 || 60;
    probe.remove();
  }
  host.style.setProperty("--cell-w", `${target}px`);
  host.style.setProperty("--cell-h", `${target * 2}px`);
  host.style.setProperty("--unicode-font", `${100 * target / natural}px`);
  host.style.width = `${columns * target}px`;
  host.style.height = `${rows * target * 2}px`;
};

const paint = (cell: HTMLElement, colour?: CellColour): void => {
  if (colour?.fg) cell.style.color = rgbHex(colour.fg);
  if (colour?.bg) cell.style.backgroundColor = rgbHex(colour.bg);
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

const rowChars = (line: string | undefined, columns: number): string => [...(line ?? "").padEnd(columns, "⠀")].slice(0, columns).join("");

export const renderDense = (host: HTMLElement, source: string | Art): void => {
  const text = typeof source === "string" ? source : source.text;
  const colours = typeof source === "string" ? undefined : source.cellColours;
  const lines = text.split("\n");
  const columns = typeof source === "string" ? stringColumns(lines) : source.columns;
  const rows = typeof source === "string" ? Math.max(1, lines.length) : source.rows;
  const defaultFg = getComputedStyle(host).color || "#201d24";
  const metric = columns > compactThreshold ? compactMetric(host) : null;
  const compact = metric !== null;
  const fragment = document.createDocumentFragment();

  host.replaceChildren();
  host.style.setProperty("--cols", String(columns));
  host.style.setProperty("--rows", String(rows));
  host.dataset.unicodeRender = compact ? "rows" : "cells";
  if (metric) {
    host.style.fontFamily = metric.family;
    host.dataset.unicodeAdvance100 = String(metric.advance100);
  } else {
    host.style.removeProperty("font-family");
    delete host.dataset.unicodeAdvance100;
  }

  for (let y = 0; y < rows; y += 1) {
    const row = document.createElement("div");
    row.className = "unicode-row";
    const chars = rowChars(lines[y], columns);
    if (compact) {
      if (!colours) row.textContent = chars;
      else {
        const offset = y * columns;
        const bg = gradient(colours, offset, columns, true, "transparent");
        const fg = gradient(colours, offset, columns, false, defaultFg);
        if (bg) row.style.backgroundImage = bg;
        const ink = document.createElement("span");
        ink.className = fg ? "unicode-ink unicode-ink-colour" : "unicode-ink";
        ink.textContent = chars;
        if (fg) ink.style.backgroundImage = fg;
        row.appendChild(ink);
      }
    } else {
      const charsArray = [...chars];
      for (let x = 0; x < columns; x += 1) {
        const cell = document.createElement("span");
        cell.className = "unicode-cell";
        cell.textContent = charsArray[x] ?? "⠀";
        paint(cell, colours?.[y * columns + x]);
        row.appendChild(cell);
      }
    }
    fragment.appendChild(row);
  }

  host.appendChild(fragment);
  fitDense(host);
};
