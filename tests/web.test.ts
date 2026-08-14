import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

test("hero starts at a vertical 50 percent split", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const css = await readFile(join(root, "web", "styles", "hero.css"), "utf8");
  expect(html).toContain('id="compare" style="--split:50%"');
  expect(html).not.toContain("Drag the vertical divider left or right.");
  expect(css).toContain("top:0;"); expect(css).toContain("bottom:0;"); expect(css).toContain("left:var(--split);"); expect(css).toContain("clip-path:inset(0 0 0 var(--split));");
});

test("ordered dithering and inverted polarity remain core and CLI defaults", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const art = await readFile(join(root, "src", "core", "art.ts"), "utf8");
  const args = await readFile(join(root, "src", "cli", "args.ts"), "utf8");
  expect(html).toContain('<option value="ordered" selected>');
  expect(art).toContain('cfg.invert ?? true'); expect(art).toContain('cfg.dither ?? "ordered"');
  expect(args).toContain('value("--dither") ?? "ordered"'); expect(args).toContain('!args.includes("--no-invert")');
});

test("hero uses detailed colour without inheriting the maker maximum", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  expect(html).toContain('id="hero-colour" type="checkbox" checked');
  expect(html).toContain('id="hero-background" type="checkbox" checked');
  expect(html).toContain('id="hero-full-colour" type="checkbox">');
  expect(maker).toContain('columns: 256, contrast: 0.55, detail: 1.2, bias: 0.25, dither: "atkinson"');
  expect(maker).not.toContain('columns: maxColumns');
  expect(maker).toContain('columns: 96, contrast: 1.12, detail: 0.34, bias: 0.015, dither: "ordered"');
});

test("light and dark themes apply visibility-friendly defaults", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  const config = await readFile(join(root, "pages.config.ts"), "utf8");
  expect(html).toContain('id="hero-background" type="checkbox" checked');
  expect(html).toContain('id="invert" type="checkbox"> Invert image polarity');
  expect(html).not.toContain('id="invert" type="checkbox" checked');
  expect(config).toContain('event: "unicode-art-theme"');
  expect(maker).toContain('heroBg.checked = light;');
  expect(maker).toContain('heroFull.checked = false;');
  expect(maker).toContain('syncColour(true, theme);');
});

test("canvas toggle is the first checkbox and forces the opposite surface in each theme", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  const css = await readFile(join(root, "web", "styles", "maker.css"), "utf8");
  const canvasAt = html.indexOf('id="canvas-toggle"');
  const invertAt = html.indexOf('id="invert"');
  const colourAt = html.indexOf('id="colour"');
  expect(canvasAt).toBeGreaterThan(-1);
  expect(canvasAt).toBeLessThan(invertAt);
  expect(canvasAt).toBeLessThan(colourAt);
  expect(html).toContain('id="canvas-toggle-label">Dark canvas</span>');
  expect(html).toContain('id="preview-contrast-info"');
  expect(maker).toContain('const automaticDarkCanvas = (theme: Theme = activeTheme()): boolean => theme === "dark" || (colour.checked && !colourBg.checked);');
  expect(maker).toContain('canvasToggleLabel.textContent = darkTheme ? "Light canvas" : "Dark canvas";');
  expect(maker).toContain('canvasToggle.checked = darkTheme ? !dark : dark;');
  expect(maker).toContain('previewScroll.toggleAttribute("data-canvas-dark", dark);');
  expect(maker).toContain('previewScroll.toggleAttribute("data-canvas-light", !dark);');
  expect(maker).toContain('const hazard = !dark && colour.checked && !colourBg.checked;');
  expect(maker).toContain('manualCanvasDark = canvasDark();');
  expect(maker).toContain('Light canvas is on, so some colours may be difficult to see.');
  expect(maker).toContain('Dark canvas is off, so some colours may be difficult to see.');
  expect(css).toContain('&[data-canvas-light]{background:#f8f5fa;');
  expect(css).toContain('&[data-canvas-dark]{background:#24212b;');
  expect(css).toContain('.output-grid{color:#f4eff5;}');
});

test("maker polarity follows the selected canvas when canvas or mode changes", async () => {
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  expect(maker).toContain('const syncMakerPolarity = (theme: Theme = activeTheme()): void => { invert.checked = canvasDark(theme); };');
  expect(maker).toContain('canvasToggle.addEventListener("change"');
  expect(maker).toContain('syncCanvas();');
  expect(maker).toContain('syncMakerPolarity();');
  expect(maker).toContain('syncColour(true); schedule();');
});

test("maker keeps slider defaults and supports 256 horizontal cells", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  expect(html).toContain('id="columns" type="range" min="24" max="256" step="1" value="96"');
  expect(html).toContain('id="contrast" type="range" min="0.55" max="1.9" step="0.01" value="1.12"');
  expect(html).toContain('id="detail" type="range" min="0" max="1.2" step="0.01" value="0.34"');
  expect(html).toContain('id="bias" type="range" min="-0.25" max="0.25" step="0.005" value="0.015"');
  expect(html).toContain('id="colour" type="checkbox"> Colour output');
  expect(html).toContain('id="colour-background" type="checkbox" disabled>');
  expect(html).toContain('id="full-colour" type="checkbox" disabled>');
  expect(maker).toContain('dither.value = colour.checked ? "atkinson" : "ordered"');
  expect(maker).toContain('if (colour.checked) { colourBg.checked = false; fullColour.checked = false; }');
});

test("maker packs paste-ready embeds in a dedicated worker with visible progress", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const maker = await readFile(join(root, "src", "web", "maker.ts"), "utf8");
  const webEmbed = await readFile(join(root, "src", "web", "embed.ts"), "utf8");
  const worker = await readFile(join(root, "src", "web", "embed-worker.ts"), "utf8");
  expect(html).toContain('id="copy-embed"');
  expect(html).toContain('id="embed-code" class="embed-code-view"');
  expect(html).toContain('id="embed-progress-bar"');
  expect(html).toContain('id="embed-progress-text"');
  expect(maker).toContain('void embedHtml(next, cfg, "auto", "auto", progress =>');
  expect(maker).toContain('setEmbedProgress(progress.done, progress.total);');
  expect(maker).toContain('embed = value;');
  expect(maker).toContain('embedView.render(value);');
  expect(maker).toContain('Optimising compact embed…');
  expect(maker).toContain('navigator.clipboard.writeText(embed)');
  expect(webEmbed).toContain('new Worker(new URL("embed-worker.js", import.meta.url)');
  expect(webEmbed).toContain('wait.progress?.(response.progress);');
  expect(webEmbed).toContain('getWorker().postMessage({ id, art, cfg, theme, surface });');
  expect(worker).toContain('const data = await packEmbedSmall(request.art, request.cfg, progress =>');
  expect(worker).toContain('self.postMessage({ id: request.id, progress } satisfies Response);');
  expect(worker).toContain('codec: embedCodec');
  expect(worker).toContain('src: __EMBED_SRC__');
  expect(worker).not.toContain("taggedText");
});

test("embed code is rendered through Marked, DOMPurify and Highlight.js", async () => {
  const view = await readFile(join(root, "src", "web", "embed-view.ts"), "utf8");
  const css = await readFile(join(root, "web", "styles", "maker.css"), "utf8");
  expect(view).toContain("marked@18.0.7");
  expect(view).toContain("dompurify@3.4.12");
  expect(view).toContain("@highlightjs/cdn-assets@11.11.1");
  expect(view).toContain("api.purify.sanitize");
  expect(view).toContain("api.highlight.highlightElement");
  expect(css).toContain(".hljs-tag");
  expect(css).toContain(".hljs-string");
  expect(css).toContain("var(--code-attr)");
});

test("top navigation stays pinned as the page scrolls", async () => {
  const css = await readFile(join(root, "web", "styles", "header.css"), "utf8");
  expect(css).toContain("position:sticky");
  expect(css).toContain("top:8px");
  expect(css).toContain("z-index:100");
  expect(css).toContain("backdrop-filter:blur(18px)");
});

test("range controls have pointer-following accessible info tooltips", async () => {
  const html = await readFile(join(root, "web", "index.html"), "utf8");
  const tips = await readFile(join(root, "src", "web", "tooltips.ts"), "utf8");
  expect((html.match(/class="slider-info/g) ?? []).length).toBeGreaterThanOrEqual(4);
  expect(html).toContain('id="slider-tip" class="slider-tip" role="tooltip"');
  expect(tips).toContain('button.addEventListener("pointermove"');
  expect(tips).toContain('button.addEventListener("focus"');
});

test("README is linked from the footer", async () => {
  const home = await readFile(join(root, "web", "index.html"), "utf8");
  const about = await readFile(join(root, "web", "about", "index.html"), "utf8");
  const readme = await readFile(join(root, "web", "readme", "index.html"), "utf8");
  expect(home).toContain('<span class="footer__links"><a href="readme/">README</a>');
  expect(about).toContain('<a href="../readme/">README</a>');
  expect(readme).toContain('<a href="./" aria-current="page">README</a>');
});

test("logo and favicon are wired into the site", async () => {
  const home = await readFile(join(root, "web", "index.html"), "utf8");
  const about = await readFile(join(root, "web", "about", "index.html"), "utf8");
  const readme = await readFile(join(root, "web", "readme", "index.html"), "utf8");
  expect(home).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
  expect(home).toContain('<img src="logo.svg" alt="" aria-hidden="true">Unicode Art Maker');
  expect(about).toContain('<link rel="icon" href="../favicon.svg" type="image/svg+xml">');
  expect(readme).toContain('<img src="../logo.svg" alt="" aria-hidden="true">Unicode Art Maker');
});

test("project version metadata stays in sync", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { version: string; name: string };
  const ver = JSON.parse(await readFile(join(root, "version.json"), "utf8")) as { version: string };
  expect(ver.version).toBe(pkg.version);
  expect(pkg.version).toMatch(/^0\.4\.\d+$/);
  expect(pkg.name).toBe("@kitty-crow/unicode-art-maker");
});

test("styles are split by concern and headings stay restrained", async () => {
  const index = await readFile(join(root, "web", "styles.css"), "utf8");
  const hero = await readFile(join(root, "web", "styles", "hero.css"), "utf8");
  expect(index).toContain('@import url("./styles/unicode.css");'); expect(index).not.toContain('styles/braille.css'); expect(hero).toContain("2.7rem"); expect(hero).not.toContain("3.35rem"); expect(hero).not.toContain("7.5rem");
});

test("README uses the shared markdown runtime and Ko-fi integration", async () => {
  const config = await readFile(join(root, "pages.config.ts"), "utf8");
  const html = await readFile(join(root, "web", "readme", "index.html"), "utf8");
  expect(config).toContain('files: ["kofi.css"]'); expect(config).toContain('user: "kittycrow"'); expect(config).toContain('repo: "braille-art-maker"');
  expect(html).toContain('id="readme-content" class="panel markdown"'); expect(html).toContain('id="readme-status" class="sr-only"');
});

test("preview display fits both available width and height", async () => {
  const dense = await readFile(join(root, "src", "web", "dense.ts"), "utf8");
  const css = await readFile(join(root, "web", "styles", "maker.css"), "utf8");
  expect(dense).toContain("Math.min(width / columns, height / (rows * 2))"); expect(dense).toContain('parent?.classList.contains("preview-scroll")');
  expect(css).toContain("height:min(70dvh,720px)"); expect(css).toContain("overflow:hidden");
});
