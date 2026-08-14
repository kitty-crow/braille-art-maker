import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { taggedText } from "../src/colour/tagged.ts";
import { parseArgs } from "../src/cli/args.ts";
import { embedCodec, packEmbed, unpackEmbed } from "../src/embed/codec.ts";
import { Tpl } from "../src/embed/tpl.ts";
import type { Art, ArtCfg, CellColour } from "../src/types.ts";

const root = join(import.meta.dir, "..");
const template = `<div data-unicode-art data-theme="{{THEME}}" data-surface="{{SURFACE}}" style="{{STYLE}}" aria-label="{{LABEL}}"><script type="application/octet-stream" data-unicode-art-data data-codec="{{CODEC}}">{{DATA}}</script><script src="{{LOAD_SRC}}" data-api="{{API_SRC}}"></script><link href="{{CSS_SRC}}"></div>`;
const colours: CellColour[] = [
  { fg: { r: 240, g: 90, b: 140 } }, { fg: { r: 240, g: 90, b: 140 } },
  { fg: { r: 90, g: 80, b: 210 }, bg: { r: 20, g: 18, b: 25 } }, { fg: { r: 90, g: 80, b: 210 }, bg: { r: 20, g: 18, b: 25 } },
  { fg: { r: 240, g: 90, b: 140 } }, { fg: { r: 240, g: 90, b: 140 } },
  {}, {},
];
const art: Art = {
  text: "⣿⣿⠿⠿\n⣿⣿⠀⠀",
  columns: 4,
  rows: 2,
  dotsWidth: 8,
  dotsHeight: 8,
  threshold: 0.5,
  density: 0.5,
  cellColours: colours,
};
const cfg: ArtCfg = { colour: true, colourBackground: true, fullColour: false };

const repeatedArt = (): Art => {
  const masks = [255, 63, 129, 24, 36, 66, 126, 0];
  const row = Array.from({ length: 64 }, (_, i) => String.fromCodePoint(0x2800 + masks[i % masks.length]!)).join("");
  return {
    text: Array.from({ length: 32 }, () => row).join("\n"),
    columns: 64,
    rows: 32,
    dotsWidth: 128,
    dotsHeight: 128,
    threshold: 0.5,
    density: 0.5,
  };
};

test("u2 embed codec round-trips masks, dimensions and exact colours", () => {
  const packed = packEmbed(art, cfg);
  const decoded = unpackEmbed(packed, "u2");
  expect(embedCodec).toBe("u2");
  expect(packed).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decoded.columns).toBe(4);
  expect(decoded.rows).toBe(2);
  expect([...decoded.masks]).toEqual([255, 255, 63, 63, 255, 255, 0, 0]);
  expect(decoded.colour).toBe(true);
  expect(decoded.colourBackground).toBe(true);
  expect(decoded.fullColour).toBe(false);
  expect(decoded.cellColours).toEqual(colours);
});

test("u1 embeds remain decodable after the u2 runtime upgrade", () => {
  const legacy = packEmbed(art, cfg, "u1");
  expect(unpackEmbed(legacy, "u1").cellColours).toEqual(colours);
  expect(unpackEmbed(legacy).cellColours).toEqual(colours);
});

test("u2 deflates the packed binary before base64url encoding", () => {
  const source = repeatedArt();
  const u1 = packEmbed(source, {}, "u1");
  const u2 = packEmbed(source, {}, "u2");
  expect(u2.length).toBeLessThan(u1.length);
  expect(u2.length).toBeLessThan(Math.floor(u1.length / 2));
  expect(unpackEmbed(u2, "u2").masks).toEqual(unpackEmbed(u1, "u1").masks);
});

test("packed embed payload is smaller than literal tagged JSON", () => {
  const packed = packEmbed(art, cfg);
  const legacy = JSON.stringify({ text: taggedText(art), columns: art.columns, rows: art.rows, colour: true, colourBackground: true, fullColour: false });
  expect(packed.length).toBeLessThan(legacy.length);
  expect(packed).not.toContain("⣿");
  expect(packed).not.toContain("<#");
});

test("embed template leaves scaffolding plain and only encodes the art payload", () => {
  const packed = packEmbed(art, cfg);
  const html = new Tpl().make({
    data: packed,
    codec: embedCodec,
    theme: "auto",
    surface: "auto",
    src: "https://example.test/v1/embed.js",
  }, { html: template });
  expect(html).toContain("<div data-unicode-art");
  expect(html).toContain('data-codec="u2"');
  expect(html).toContain('type="application/octet-stream"');
  expect(html).toContain("https://example.test/v1/embed.css");
  expect(html).toContain("https://example.test/v1/load.js");
  expect(html).toContain(packed);
  expect(html).not.toContain("⣿");
  expect(html).not.toContain("<#");
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
  expect(loader).toContain("win.UnicodeArt");
  expect(loader).toContain("api.mount(host)");
  expect(css).toContain(":host");
  expect(css).toContain("font-synthesis: none");
});

test("embed runtime accepts u1 and u2 in shadow DOM", async () => {
  const runtime = await readFile(join(root, "src", "embed", "runtime.ts"), "utf8");
  expect(runtime).toContain('codec !== "u1" && codec !== "u2"');
  expect(runtime).toContain('unpackEmbed(data.textContent ?? "", codec as EmbedCodec)');
  expect(runtime).toContain('String.fromCodePoint(0x2800 +');
  expect(runtime).toContain('attachShadow({ mode: "open" })');
  expect(runtime).toContain('"⣿".repeat(200)');
  expect(runtime).toContain("new ResizeObserver");
  expect(runtime).toContain("new MutationObserver");
});

test("auto embed surface protects foreground-only colour on light themes", async () => {
  const runtime = await readFile(join(root, "src", "embed", "runtime.ts"), "utf8");
  expect(runtime).toContain('if (surface === "dark") return true;');
  expect(runtime).toContain('if (surface === "light") return false;');
  expect(runtime).toContain('if (this.themeDark()) return true;');
  expect(runtime).toContain('payload?.colour === true && !payload.colourBackground && !payload.fullColour');
});
