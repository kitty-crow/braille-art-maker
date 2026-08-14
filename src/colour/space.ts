import type { Rgb } from "../types.ts";

export interface Lab { readonly l: number; readonly a: number; readonly b: number; }
export interface Sample { readonly rgb: Rgb; readonly lin: Rgb; readonly lab: Lab; readonly alpha: number; readonly slot: number; }

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const toLin = (v: number): number => { const n = clamp01(v / 255); return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
const fromLin = (v: number): number => { const n = clamp01(v); return Math.round(255 * (n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055)); };

export const rgbToLab = (rgb: Rgb): Lab => {
  const r = toLin(rgb.r), g = toLin(rgb.g), b = toLin(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return { l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
};

export const sample = (r: number, g: number, b: number, alpha: number, slot: number): Sample => {
  const rgb = { r, g, b };
  return { rgb, lin: { r: toLin(r), g: toLin(g), b: toLin(b) }, lab: rgbToLab(rgb), alpha, slot };
};

export const labDist = (a: Lab, b: Lab): number => Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);

export const meanColour = (samples: readonly Sample[]): Rgb | undefined => {
  let wr = 0, wg = 0, wb = 0, w = 0;
  for (const s of samples) { if (s.alpha <= 0) continue; wr += s.lin.r * s.alpha; wg += s.lin.g * s.alpha; wb += s.lin.b * s.alpha; w += s.alpha; }
  return w ? { r: fromLin(wr / w), g: fromLin(wg / w), b: fromLin(wb / w) } : undefined;
};

export const meanLab = (samples: readonly Sample[]): Lab => {
  let l = 0, a = 0, b = 0, w = 0;
  for (const s of samples) { l += s.lab.l * s.alpha; a += s.lab.a * s.alpha; b += s.lab.b * s.alpha; w += s.alpha; }
  return w ? { l: l / w, a: a / w, b: b / w } : { l: 0, a: 0, b: 0 };
};

export const rgbHex = (rgb: Rgb): string => `#${[rgb.r, rgb.g, rgb.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
