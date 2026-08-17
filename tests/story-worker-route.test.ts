import { expect, test } from "bun:test";
import { shouldTransferEmbedRaw } from "../src/web/embed.ts";

test("256-column full-colour story embeds use the bounded raw worker path", () => {
  expect(shouldTransferEmbedRaw(256, {
    columns: 256,
    colour: true,
    colourBackground: true,
    fullColour: true,
  }, true)).toBe(true);
});

test("full-colour story embeds avoid the optimiser path below 256 too", () => {
  expect(shouldTransferEmbedRaw(128, {
    columns: 128,
    colour: true,
    colourBackground: true,
    fullColour: true,
  }, true)).toBe(true);
});

test("ordinary sub-256 embeds keep the optimiser path", () => {
  expect(shouldTransferEmbedRaw(128, {
    columns: 128,
    colour: true,
    colourBackground: false,
    fullColour: false,
  }, false)).toBe(false);
});
