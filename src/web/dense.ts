import type { Art, CellColour, Rgb } from "../types.ts";
import { rgbHex } from "../colour/space.ts";

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

export const fitDense = (host: HTMLElement): void => {
  const columns = Number(host.style.getPropertyValue("--cols")) || 1;
  const rows = Number(host.style.getPropertyValue("--rows")) || 1;
  const { width, height } = innerSize(frameFor(host));
  if (!width || !height) return;
  const target = Math.min(width / columns, height / (rows * 2));
  const probe = document.createElement("span");
  probe.textContent = "⣿".repeat(100);
  probe.className = "unicode-probe";
  probe.style.fontSize = "100px";
  host.appendChild(probe);
  const natural = probe.getBoundingClientRect().width / 100 || 60;
  probe.remove();
  host.style.setProperty("--cell-w", `${target}px`);
  host.style.setProperty("--cell-h", `${target * 2}px`);
  host.style.setProperty("--unicode-font", `${100 * target / natural}px`);
  host.style.width = `${columns * target}px`;
  host.style.height = `${rows * target * 2}px`;
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
  let hasExplicit = false;
  const stops: string[] = [];
  let start = 0;
  while (start < columns) {
    const rgb = rgbAt(start);
    if (rgb) hasExplicit = true;
    let end = start + 1;
    while (end < columns && sameRgb(rgb, rgbAt(end))) end += 1;
    const colour = cssRgb(rgb, fallback);
    stops.push(`${colour} ${pct(start, columns)}`, `${colour} ${pct(end, columns)}`);
    start = end;
  }
  return hasExplicit ? `linear-gradient(to right,${stops.join(",")})` : null;
};

const stringColumns = (lines: readonly string[]): number => {
  let columns = 1;
  for (const line of lines) columns = Math.max(columns, [...line].length);
  return columns;
};

export const renderDense = (host: HTMLElement, source: string | Art): void => {
  const text = typeof source === "string" ? source : source.text;
  const colours = typeof source === "string" ? undefined : source.cellColours;
  const lines = text.split("\n");
  const columns = typeof source === "string" ? stringColumns(lines) : source.columns;
  const rows = typeof source === "string" ? Math.max(1, lines.length) : source.rows;
  const defaultFg = getComputedStyle(host).color || "#201d24";
  const fragment = document.createDocumentFragment();

  host.replaceChildren();
  host.style.setProperty("--cols", String(columns));
  host.style.setProperty("--rows", String(rows));

  for (let y = 0; y < rows; y += 1) {
    const row = document.createElement("div");
    row.className = "unicode-row";
    const chars = [...(lines[y] ?? "").padEnd(columns, "⠀")].slice(0, columns).join("");
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
    fragment.appendChild(row);
  }

  host.appendChild(fragment);
  fitDense(host);
};
