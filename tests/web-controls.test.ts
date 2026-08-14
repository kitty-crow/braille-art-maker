import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("reset sliders restores only the four maker slider defaults", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  expect(html).toContain('<button id="reset-sliders" class="button" type="button">Reset sliders</button>');

  const match = maker.match(/reset\.addEventListener\("click", \(\) => \{([\s\S]*?)\n  \}\);/u);
  expect(match).not.toBeNull();
  const handler = match?.[1] ?? "";
  expect(handler).toContain('columns.value = "96";');
  expect(handler).toContain('contrast.value = "1.12";');
  expect(handler).toContain('detail.value = "0.34";');
  expect(handler).toContain('bias.value = "0.015";');
  expect(handler).toContain('columnsOut.value = columns.value;');
  expect(handler).toContain('schedule();');
  expect(handler).not.toContain("colour.checked");
  expect(handler).not.toContain("colourBg.checked");
  expect(handler).not.toContain("fullColour.checked");
  expect(handler).not.toContain("dither.value");
  expect(handler).not.toContain("invert.checked");
});
