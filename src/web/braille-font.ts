export interface BrailleFontFit {
  readonly family: string;
  readonly fontPx: number;
  readonly cellPx: number;
}

const glyphs = Array.from({ length: 256 }, (_, mask) => String.fromCodePoint(0x2800 + mask)).join("");

const families = [
  '"Apple Braille", monospace',
  '"Noto Sans Symbols 2", monospace',
  '"DejaVu Sans Mono", monospace',
  '"Cascadia Mono", monospace',
  '"Cascadia Code", monospace',
  '"Segoe UI Symbol", monospace',
  "monospace",
] as const;

const probe = (host: HTMLElement, family: string, fontPx: number, text: string): HTMLSpanElement => {
  const span = document.createElement("span");
  span.className = "unicode-probe";
  span.style.fontFamily = family;
  span.style.fontSize = `${fontPx}px`;
  span.style.fontKerning = "none";
  span.style.fontVariantLigatures = "none";
  span.style.letterSpacing = "0";
  span.textContent = text;
  host.append(span);
  return span;
};

const baseAdvance = (host: HTMLElement, family: string): number => {
  const span = probe(host, family, 100, "⣿".repeat(256));
  const width = span.getBoundingClientRect().width;
  span.remove();
  return width > 0 ? width / 256 : 0;
};

const exactAt = (host: HTMLElement, family: string, fontPx: number, cellPx: number): boolean => {
  const span = probe(host, family, fontPx, glyphs);
  const node = span.firstChild;
  if (!(node instanceof Text)) { span.remove(); return false; }

  const box = span.getBoundingClientRect();
  const tolerance = Math.max(0.035, cellPx * 0.025);
  if (Math.abs(box.width - cellPx * 256) > tolerance * 2) { span.remove(); return false; }

  const range = document.createRange();
  for (let i = 0; i < 256; i += 1) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    const expected = box.left + i * cellPx;
    if (Math.abs(rect.left - expected) > tolerance || Math.abs(rect.width - cellPx) > tolerance) {
      span.remove();
      return false;
    }
  }

  span.remove();
  return true;
};

export const exactBrailleFont = (host: HTMLElement, cellPx: number): BrailleFontFit | null => {
  if (!(cellPx > 0)) return null;
  for (const family of families) {
    const advance = baseAdvance(host, family);
    if (!(advance > 0)) continue;
    const fontPx = 100 * cellPx / advance;
    if (exactAt(host, family, fontPx, cellPx)) return { family, fontPx, cellPx };
  }
  return null;
};
