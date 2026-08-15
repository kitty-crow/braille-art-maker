import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string): Promise<string> => readFile(join(root, path), "utf8");

test("hero starts at a vertical 50 percent split", async () => {
  const html = await read("web/index.html");
  const css = await read("web/styles/hero.css");
  expect(html).toContain('id="compare" style="--split:50%"');
  expect(html).not.toContain("Drag the vertical divider left or right.");
  expect(css).toContain("top:0;");
  expect(css).toContain("bottom:0;");
  expect(css).toContain("left:var(--split);");
  expect(css).toContain("clip-path:inset(0 0 0 var(--split));");
});

test("ordered dithering and inverted polarity remain core and CLI defaults", async () => {
  const html = await read("web/index.html");
  const art = await read("src/core/art.ts");
  const args = await read("src/cli/args.ts");
  expect(html).toContain('<option value="ordered" selected>');
  expect(art).toContain('cfg.invert ?? true');
  expect(art).toContain('cfg.dither ?? "ordered"');
  expect(args).toContain('value("--dither") ?? "ordered"');
  expect(args).toContain('!args.includes("--no-invert")');
});

test("Unicode Art Studio naming is consistent across the browser shell", async () => {
  const home = await read("web/index.html");
  const about = await read("web/about/index.html");
  const readme = await read("web/readme/index.html");
  const logo = await read("web/logo.svg");
  const web = await read("src/web.ts");
  expect(home).toContain("<title>Unicode Art Studio</title>");
  expect(home).toContain('href="#studio">Studio</a>');
  expect(home).toContain('<section class="studio shell" id="studio">');
  expect(home).toContain("Unicode Art Studio <span data-version>");
  expect(about).toContain("Unicode Art Studio");
  expect(about).toContain('href="../#studio">Studio</a>');
  expect(readme).toContain("Unicode Art Studio");
  expect(logo).toContain("<title id=\"title\">Unicode Art Studio</title>");
  expect(web).toContain('import { startStudio } from "./web/studio.ts";');
  expect(web).toContain("startStudio();");
});

test("hero uses detailed colour without inheriting the studio maximum", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  expect(html).toContain('id="hero-colour" type="checkbox" checked> Colour');
  expect(html).toContain('id="hero-full-colour" type="checkbox"> Full Colour');
  expect(html).not.toContain('id="hero-background"');
  expect(studio).toContain('columns: 256, contrast: 0.55, detail: 1.2, bias: 0.25, dither: "atkinson"');
  expect(studio).not.toContain('columns: maxColumns');
  expect(studio).toContain('columns: 96, contrast: 1.12, detail: 0.34, bias: 0.015, dither: "ordered"');
});

test("light and dark themes keep visibility-friendly colour defaults", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  const config = await read("pages.config.ts");
  expect(html).not.toContain('id="hero-background"');
  expect(html).toContain('id="invert" type="checkbox"> Invert image polarity');
  expect(html).not.toContain('id="invert" type="checkbox" checked');
  expect(config).toContain('key: "unicode-art-studio.theme"');
  expect(config).toContain('event: "unicode-art-theme"');
  expect(studio).toContain('heroFull.checked = false;');
  expect(studio).toContain('syncColour(true, theme);');
});

test("canvas toggle is the first artwork checkbox and forces the opposite surface in each theme", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  const css = await read("web/styles/studio.css");
  const canvasAt = html.indexOf('id="canvas-toggle"');
  const invertAt = html.indexOf('id="invert"');
  const colourAt = html.indexOf('id="colour"');
  expect(canvasAt).toBeGreaterThan(-1);
  expect(canvasAt).toBeLessThan(invertAt);
  expect(canvasAt).toBeLessThan(colourAt);
  expect(html).toContain('id="canvas-toggle-label">Dark canvas</span>');
  expect(html).toContain('id="preview-contrast-info"');
  expect(studio).toContain('const automaticDarkCanvas = (theme: Theme = activeTheme()): boolean => theme === "dark" || (colour.checked && !fullColour.checked);');
  expect(studio).toContain('canvasToggleLabel.textContent = darkTheme ? "Light canvas" : "Dark canvas";');
  expect(studio).toContain('canvasToggle.checked = darkTheme ? !dark : dark;');
  expect(studio).toContain('previewScroll.toggleAttribute("data-canvas-dark", dark);');
  expect(studio).toContain('previewScroll.toggleAttribute("data-canvas-light", !dark);');
  expect(studio).toContain('const hazard = !dark && colour.checked && !fullColour.checked;');
  expect(studio).toContain('manualCanvasDark = canvasDark();');
  expect(css).toContain('&[data-canvas-light]{background:#f8f5fa;');
  expect(css).toContain('&[data-canvas-dark]{background:#24212b;');
});

test("studio polarity follows the selected canvas when canvas or mode changes", async () => {
  const studio = await read("src/web/studio.ts");
  expect(studio).toContain('const syncStudioPolarity = (theme: Theme = activeTheme()): void => { invert.checked = canvasDark(theme); };');
  expect(studio).toContain('canvasToggle.addEventListener("change"');
  expect(studio).toContain('syncCanvas();');
  expect(studio).toContain('syncStudioPolarity();');
  expect(studio).toContain('syncColour(true); schedule();');
});

test("studio gates high resolutions, stops the slider at 2048 and allows confirmed manual values beyond it", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  const gate = await read("src/web/resolution.ts");
  const css = await read("web/styles/studio.css");
  expect(html).toContain('Resolution <input id="columns-value" class="resolution-value" type="number" min="24" step="1" value="96"');
  expect(html).not.toContain('id="columns-value" class="resolution-value" type="number" min="24" max=');
  expect(html).toContain('id="columns" type="range" min="24" max="2048" step="1" value="96"');
  expect(studio).toContain('const resolutionMax = 2048;');
  expect(studio).toContain('columnsValue.removeAttribute("max");');
  expect(studio).toContain('confirmAboveMax: value => window.confirm');
  expect(studio).toContain('2K was the last stop. Are nya sure you want to keep going?');
  expect(gate).toContain('value: 765');
  expect(gate).toContain('value: 1024');
  expect(gate).toContain('1K? Are nya crazy?! I’d hate to be your RAM right meow!');
  expect(css).toContain('.resolution-value');
  expect(css).toContain('.resolution-notch');
});

test("studio exposes only foreground Colour and Full Colour", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  expect(html).toContain('id="colour" type="checkbox"> Colour');
  expect(html).toContain('id="full-colour" type="checkbox" disabled> Full Colour');
  expect(html).not.toContain('id="colour-background"');
  expect(studio).toContain('const full = colour.checked && fullColour.checked;');
  expect(studio).toContain('colour: colour.checked, colourBackground: full, fullColour: full');
  expect(studio).toContain('dither.value = colour.checked ? "atkinson" : "ordered"');
});

test("Compact exposes Payload as a story as an embed-only checkbox", async () => {
  const view = await read("src/web/embed-view.ts");
  const studio = await read("src/web/studio.ts");
  const css = await read("web/styles/embed-tabs.css");
  expect(view).toContain('this.tab("Compact", "compact", true)');
  expect(view).toContain('this.tab("No JavaScript", "static", false)');
  expect(view).toContain('this.storyInput.id = "payload-as-story";');
  expect(view).toContain('document.createTextNode(" Payload as a story")');
  expect(view).toContain("See README → Compact payload modes.");
  expect(view).toContain('this.compactOptions.hidden = mode !== "compact";');
  expect(studio).toContain('const regenerateEmbed = (): void =>');
  expect(studio).toContain('scheduleEmbed(art, studioCfg(), generation, currentCacheId, currentSource, name, currentPaths, currentRectangles, false);');
  expect(studio).toContain('storyPayload = story;');
  expect(studio).toContain('regenerateEmbed();');
  expect(css).toContain('.embed-story-option');
  expect(css).toContain('.embed-story-info');
});

test("studio packs paste-ready embeds in a dedicated worker with selectable payload representation", async () => {
  const html = await read("web/index.html");
  const studio = await read("src/web/studio.ts");
  const webEmbed = await read("src/web/embed.ts");
  const worker = await read("src/web/embed-worker.ts");
  expect(html).toContain('id="copy-embed"');
  expect(html).toContain('id="embed-code" class="embed-code-view"');
  expect(html).toContain('<span>Encoding art…</span>');
  expect(studio).toContain('void embedHtml(next, cfg, "auto", "auto", progress =>');
  expect(studio).toContain('}, raw, story).then(value =>');
  expect(studio).toContain('setEmbedProgress(progress.done, progress.total);');
  expect(studio).toContain('embedView.render(value);');
  expect(studio).toContain('navigator.clipboard.writeText(embed)');
  expect(webEmbed).toContain('const workerUrl = new URL("embed-worker.js", import.meta.url);');
  expect(webEmbed).toContain('getWorker().postMessage({ id, art, cfg, theme, surface, story });');
  expect(webEmbed).toContain('getWorker().postMessage({ id, raw, cfg, theme, surface, story }, [raw.buffer as ArrayBuffer]);');
  expect(worker).toContain('readonly story: boolean;');
  expect(worker).toContain('packEmbedSmall(request.art, request.cfg, progress, request.story)');
  expect(worker).toContain('packRawEmbedSmall(request.raw, progress, request.story)');
});

test("studio persists latest compact art and finished embed in IndexedDB", async () => {
  const studio = await read("src/web/studio.ts");
  const store = await read("src/web/art-store.ts");
  const guard = await read("src/web/cache-guard.ts");
  expect(store).toContain('const dbName = "unicode-art-studio-cache";');
  expect(store).toContain('const dbVersion = 2;');
  expect(store).toContain('const sessionStore = "session-v2";');
  expect(store).toContain('const artStore = "art-v2";');
  expect(store).toContain('const embedStore = "embed-v2";');
  expect(guard).toContain('const key = "unicode-art-studio:cache-restore-pending";');
  expect(studio).toContain('const cachedRaw = new Blob([raw.buffer as ArrayBuffer]');
  expect(studio).toContain('storeCachedArt(__WEB_VERSION__');
  expect(studio).toContain('storeCachedEmbed(__WEB_VERSION__');
  expect(studio).toContain('loadCachedArt(__WEB_VERSION__)');
  expect(studio).toContain('storyPayload = storyEmbed(cached.embed);');
});

test("embed code is rendered through Marked, DOMPurify and Highlight.js", async () => {
  const view = await read("src/web/embed-view.ts");
  const css = await read("web/styles/studio.css");
  expect(view).toContain("marked@18.0.7");
  expect(view).toContain("dompurify@3.4.12");
  expect(view).toContain("@highlightjs/cdn-assets@11.11.1");
  expect(view).toContain("api.purify.sanitize");
  expect(view).toContain("api.highlight.highlightElement");
  expect(css).toContain(".hljs-tag");
  expect(css).toContain(".hljs-string");
  expect(css).toContain("var(--code-attr)");
});

test("top navigation stays pinned as the page scrolls without the temporary test badge", async () => {
  const css = await read("web/styles/header.css");
  expect(css).toContain("position:sticky");
  expect(css).toContain("top:8px");
  expect(css).toContain("z-index:100");
  expect(css).toContain("backdrop-filter:blur(18px)");
  expect(css).not.toContain("TEST BUILD");
});

test("range and story controls use pointer-following accessible info tooltips", async () => {
  const html = await read("web/index.html");
  const tips = await read("src/web/tooltips.ts");
  const view = await read("src/web/embed-view.ts");
  expect((html.match(/class="slider-info/g) ?? []).length).toBeGreaterThanOrEqual(4);
  expect(html).toContain('id="slider-tip" class="slider-tip" role="tooltip"');
  expect(view).toContain('info.className = "slider-info embed-story-info";');
  expect(tips).toContain('button.addEventListener("pointermove"');
  expect(tips).toContain('button.addEventListener("focus"');
});

test("README is linked from the footer", async () => {
  const home = await read("web/index.html");
  const about = await read("web/about/index.html");
  const readme = await read("web/readme/index.html");
  expect(home).toContain('<span class="footer__links"><a href="readme/">README</a>');
  expect(about).toContain('<a href="../readme/">README</a>');
  expect(readme).toContain('<a href="./" aria-current="page">README</a>');
});

test("logo and favicon are wired into the Studio site", async () => {
  const home = await read("web/index.html");
  const about = await read("web/about/index.html");
  const readme = await read("web/readme/index.html");
  expect(home).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
  expect(home).toContain('<img src="logo.svg" alt="" aria-hidden="true">Unicode Art Studio');
  expect(about).toContain('<link rel="icon" href="../favicon.svg" type="image/svg+xml">');
  expect(readme).toContain('<img src="../logo.svg" alt="" aria-hidden="true">Unicode Art Studio');
});

test("project version and package metadata stay in sync", async () => {
  const pkg = JSON.parse(await read("package.json")) as { version: string; name: string; repository: string };
  const ver = JSON.parse(await read("version.json")) as { version: string };
  expect(ver.version).toBe(pkg.version);
  expect(pkg.version).toBe("0.4.36");
  expect(pkg.name).toBe("@kitty-crow/unicode-art-studio");
  expect(pkg.repository).toBe("github:kitty-crow/braille-art-maker");
});

test("styles are split by concern and Studio stylesheet is canonical", async () => {
  const index = await read("web/styles.css");
  const hero = await read("web/styles/hero.css");
  expect(index).toContain('@import url("./styles/studio.css");');
  expect(index).not.toContain('styles/maker.css');
  expect(index).toContain('@import url("./styles/unicode.css");');
  expect(hero).toContain("2.7rem");
  expect(hero).not.toContain("3.35rem");
});

test("README uses the shared markdown runtime and Ko-fi integration", async () => {
  const config = await read("pages.config.ts");
  const html = await read("web/readme/index.html");
  expect(config).toContain('files: ["kofi.css"]');
  expect(config).toContain('user: "kittycrow"');
  expect(config).toContain('repo: "braille-art-maker"');
  expect(html).toContain('id="readme-content" class="panel markdown"');
  expect(html).toContain('id="readme-status" class="sr-only"');
});

test("preview display fits both available width and height", async () => {
  const dense = await read("src/web/dense.ts");
  const css = await read("web/styles/studio.css");
  expect(dense).toContain("Math.min(width / columns, height / (rows * 2))");
  expect(dense).toContain('parent?.classList.contains("preview-scroll")');
  expect(css).toContain("height:min(70dvh,720px)");
  expect(css).toContain("overflow:hidden");
});
