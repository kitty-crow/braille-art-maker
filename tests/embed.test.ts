import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "../src/cli/args.ts";
import { Tpl } from "../src/embed/tpl.ts";

const root = join(import.meta.dir, "..");
const template = `<div data-unicode-art data-theme="{{THEME}}" data-surface="{{SURFACE}}" style="{{STYLE}}" aria-label="{{LABEL}}"><script type="application/json" data-unicode-art-data>{{DATA}}</script><script src="{{LOAD_SRC}}" data-api="{{API_SRC}}"></script><link href="{{CSS_SRC}}"></div>`;

test("embed template carries portable Unicode output and derives sibling assets", () => {
  const html = new Tpl().make({
    payload: { text: "<#f00>⣿", columns: 1, rows: 1, colour: true, colourBackground: false, fullColour: false },
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: template });
  expect(html).toContain('data-unicode-art');
  expect(html).toContain('https://example.test/v1/embed.css');
  expect(html).toContain('https://example.test/v1/load.js');
  expect(html).toContain('\\u003c#f00\\u003e⣿');
});

test("CLI embed input parsing does not mistake option values for the PNG", () => {
  const args = parseArgs(["--columns", "120", "image.png", "--embed", "--embed-theme", "light"]);
  expect(args.input).toBe("image.png");
  expect(args.embed).toBe(true);
  expect(args.embedTheme).toBe("light");
  expect(args.art.columns).toBe(120);
});

test("build publishes the versioned CDN runtime and loader", async () => {
  const build = await readFile(join(root, "src", "build.ts"), "utf8");
  const loader = await readFile(join(root, "templates", "embed", "load.js"), "utf8");
  const css = await readFile(join(root, "templates", "embed", "embed.css"), "utf8");
  expect(build).toContain('join(site, "v1")');
  expect(build).toContain('naming: "embed.js"');
  expect(build).toContain('join(api, "load.js")');
  expect(loader).toContain('win.UnicodeArt');
  expect(loader).toContain('api.mount(host)');
  expect(css).toContain(':host');
  expect(css).toContain('font-synthesis: none');
});

test("embed runtime uses shadow DOM and a 200-character geometry probe", async () => {
  const runtime = await readFile(join(root, "src", "embed", "runtime.ts"), "utf8");
  expect(runtime).toContain('attachShadow({ mode: "open" })');
  expect(runtime).toContain('"⣿".repeat(200)');
  expect(runtime).toContain('new ResizeObserver');
  expect(runtime).toContain('new MutationObserver');
});
