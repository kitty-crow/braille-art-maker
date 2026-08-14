import { vectorise } from "../../vendor/vectoriser/src/index.ts";
import type { Pixels, VecCfg, VecStage } from "../types.ts";
import { rasterVectorSvg } from "./raster.ts";

export const vectorStage = (pixels: Pixels, cfg: VecCfg = {}): VecStage => {
  const result = vectorise(pixels, { colours: cfg.colours ?? 64, alphaLevels: cfg.alphaLevels ?? 16, alphaThreshold: 0, crop: false, precision: 4, iterations: 12, sampleLimit: 12000, seed: 39, title: "Unicode Art Maker vector stage" });
  return { svg: result.svg, pixels: rasterVectorSvg(result.svg, result.width, result.height), paths: result.paths, rectangles: result.rectangles };
};
