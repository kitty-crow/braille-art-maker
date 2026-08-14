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
const sameColour = (a?: CellColour, b?: CellColour): boolean => sameRgb(a?.fg, b?.fg) && sameRgb(a?.bg, b?.bg);

const paint = (run: HTMLElement, colour?: CellColour): void => {
  if (colour?.fg) run.style.color = rgbHex(colour.fg);
  if (colour?.bg) run.style.backgroundColor = rgbHex(colour.bg);
};

const appendColourRuns = (row: HTMLElement, chars: readonly string[], colours: readonly CellColour[] | undefined, offset: number, columns: number): void => {
  let start = 0;
  while (start < columns) {
    const colour = colours?.[offset + start];
    let end = start + 1;
    while (end < columns && sameColour(colour, colours?.[offset + end])) end += 1;
    const run = document.createElement("span");
    run.className = "unicode-run";
    run.textContent = chars.slice(start, end).join("");
    run.style.setProperty("--run-cells", String(end - start));
    paint(run, colour);
    row.appendChild(run);
    start = end;
  }
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
  const fragment = document.createDocumentFragment();

  host.replaceChildren();
  host.style.setProperty("--cols", String(columns));
  host.style.setProperty("--rows", String(rows));

  for (let y = 0; y < rows; y += 1) {
    const row = document.createElement("div");
    row.className = "unicode-row";
    const chars = [...(lines[y] ?? "").padEnd(columns, "⠀")].slice(0, columns);
    if (!colours) row.textContent = chars.join("");
    else appendColourRuns(row, chars, colours, y * columns, columns);
    fragment.appendChild(row);
  }

  host.appendChild(fragment);
  fitDense(host);
};
