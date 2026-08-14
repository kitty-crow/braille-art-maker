import type { Art, CellColour } from "../types.ts";
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

const paint = (cell: HTMLElement, colour?: CellColour): void => {
  if (colour?.fg) cell.style.color = rgbHex(colour.fg);
  if (colour?.bg) cell.style.backgroundColor = rgbHex(colour.bg);
};

export const renderDense = (host: HTMLElement, source: string | Art): void => {
  const text = typeof source === "string" ? source : source.text;
  const colours = typeof source === "string" ? undefined : source.cellColours;
  const lines = text.split("\n");
  const columns = typeof source === "string" ? Math.max(1, ...lines.map(line => [...line].length)) : source.columns;
  host.replaceChildren();
  host.style.setProperty("--cols", String(columns));
  host.style.setProperty("--rows", String(typeof source === "string" ? Math.max(1, lines.length) : source.rows));
  let ci = 0;
  for (const line of lines) {
    const row = document.createElement("div");
    row.className = "unicode-row";
    for (const char of line.padEnd(columns, "⠀")) {
      const cell = document.createElement("span");
      cell.className = "unicode-cell";
      cell.textContent = char;
      paint(cell, colours?.[ci++]);
      row.appendChild(cell);
    }
    host.appendChild(row);
  }
  fitDense(host);
};
