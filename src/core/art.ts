import type { Art, ArtCfg, Pixels } from "../types.ts";
import { colourCells } from "../colour/cells.ts";
import { packUnicode } from "./unicode.ts";
import { dither } from "./dither.ts";
import { resize } from "./resize.ts";
import { signal } from "./signal.ts";
import { artSize, minColumns } from "./size.ts";
import { contrast, otsu, sharpen, stretch } from "./tone.ts";

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export const makeArt = (pixels: Pixels, cfg: ArtCfg = {}): Art => {
  const columns = Math.max(minColumns, Math.round(cfg.columns ?? Math.max(48, Math.min(112, pixels.width / 5))));
  const { dotsWidth, dotsHeight, rows } = artSize(pixels.width, pixels.height, columns);
  const small = resize(pixels, dotsWidth, dotsHeight);
  const { ink, active } = signal(small, cfg.invert ?? true);
  stretch(ink, active);
  contrast(ink, active, clamp(cfg.contrast ?? 1.12, 0.4, 2.4));
  sharpen(ink, active, dotsWidth, dotsHeight, clamp(cfg.detail ?? 0.34, 0, 1.5));
  const threshold = clamp(otsu(ink, active) + clamp(cfg.bias ?? 0.015, -0.35, 0.35), 0.12, 0.88);
  const baseDots = dither(ink, active, dotsWidth, dotsHeight, cfg.dither ?? "ordered", threshold);
  const coloured = cfg.colour ? colourCells(small, baseDots, cfg.colourBackground ?? false, (cfg.fullColour ?? false) && (cfg.colourBackground ?? false)) : undefined;
  const dots = coloured?.dots ?? baseDots;
  let on = 0;
  for (const dot of dots) on += dot;
  return {
    text: packUnicode(dots, dotsWidth, dotsHeight), columns, rows, dotsWidth, dotsHeight, threshold,
    density: dots.length ? on / dots.length : 0,
    ...(coloured ? { cellColours: coloured.cells } : {})
  };
};
