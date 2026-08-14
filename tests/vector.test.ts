import { expect, test } from "bun:test";
import { rasterVectorSvg } from "../src/vector/raster.ts";

test("rasterises Vectoriser rectilinear paths", () => {
  const svg = '<svg><path fill="#ff0000" fill-opacity="0.5000" d="M1 1h2v1h-2Z"/></svg>';
  const pixels = rasterVectorSvg(svg, 4, 3);
  const i = (1 * 4 + 1) * 4;
  expect(pixels.data[i]).toBe(255); expect(pixels.data[i + 1]).toBe(0); expect(pixels.data[i + 3]).toBe(128); expect(pixels.data[0]).toBe(0);
});
