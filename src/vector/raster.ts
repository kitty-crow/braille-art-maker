import type { Pixels } from "../types.ts";

const pathRe = /<path\s+fill="#([0-9a-fA-F]{6})"\s+fill-opacity="([0-9.]+)"\s+d="([^"]*)"\/>/g;
const rectRe = /M(-?\d+) (-?\d+)h(-?\d+)v(-?\d+)h-?\d+Z/g;
const hex = (value: string): readonly [number, number, number] => [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];

export const rasterVectorSvg = (svg: string, width: number, height: number): Pixels => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const match of svg.matchAll(pathRe)) {
    const colour = hex(match[1] ?? "000000");
    const alpha = Math.round(Math.max(0, Math.min(1, Number(match[2] ?? "1"))) * 255);
    for (const rect of (match[3] ?? "").matchAll(rectRe)) {
      const x = Number(rect[1] ?? 0), y = Number(rect[2] ?? 0), w = Number(rect[3] ?? 0), h = Number(rect[4] ?? 0);
      for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
        const i = (yy * width + xx) * 4;
        data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = alpha;
      }
    }
  }
  return { width, height, data };
};
