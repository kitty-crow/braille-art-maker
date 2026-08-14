import { taggedText } from "../colour/tagged.ts";
import { makeArt } from "../core/art.ts";
import { maxColumns } from "../core/size.ts";
import { denseHtml } from "../html/dense.ts";
import type { Art, ArtCfg, Dither, Pixels, VecStage } from "../types.ts";
import { vectorStage } from "../vector/stage.ts";
import { bindCompare } from "./compare.ts";
import { fitDense, renderDense } from "./dense.ts";
import { qs } from "./dom.ts";
import { download } from "./download.ts";
import { decodeImage } from "./image.ts";
import { bindTooltips } from "./tooltips.ts";

type Theme = "light" | "dark";

const activeTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  if (value === "light" || value === "dark") return value;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const startMaker = (): void => {
  const heroImg = qs<HTMLImageElement>("#hero-source"), heroUnicode = qs<HTMLElement>("#hero-unicode"), compare = qs<HTMLElement>("#compare"), divider = qs<HTMLElement>("#compare-divider");
  const heroColour = qs<HTMLInputElement>("#hero-colour"), heroBg = qs<HTMLInputElement>("#hero-background"), heroFull = qs<HTMLInputElement>("#hero-full-colour");
  const upload = qs<HTMLInputElement>("#upload"), drop = qs<HTMLElement>("#drop"), output = qs<HTMLElement>("#output"), status = qs<HTMLElement>("#status");
  const columns = qs<HTMLInputElement>("#columns"), contrast = qs<HTMLInputElement>("#contrast"), detail = qs<HTMLInputElement>("#detail"), bias = qs<HTMLInputElement>("#bias"), dither = qs<HTMLSelectElement>("#dither"), invert = qs<HTMLInputElement>("#invert");
  const colour = qs<HTMLInputElement>("#colour"), colourBg = qs<HTMLInputElement>("#colour-background"), fullColour = qs<HTMLInputElement>("#full-colour");
  const copy = qs<HTMLButtonElement>("#copy"), txt = qs<HTMLButtonElement>("#download-txt"), html = qs<HTMLButtonElement>("#download-html"), svg = qs<HTMLButtonElement>("#download-svg"), metrics = qs<HTMLElement>("#metrics"), columnsOut = qs<HTMLOutputElement>("#columns-out");

  let vector: VecStage | null = null, name = "hero", art: Art | null = null, loadGeneration = 0;
  let heroPixels: Pixels | null = null, heroObjectUrl: string | null = null;

  const setStatus = (text: string, busy = false): void => { status.textContent = text; status.toggleAttribute("data-busy", busy); };
  const makerCfg = (): ArtCfg => ({
    columns: Number(columns.value), contrast: Number(contrast.value), detail: Number(detail.value), bias: Number(bias.value), dither: dither.value as Dither, invert: invert.checked,
    colour: colour.checked, colourBackground: colour.checked && colourBg.checked, fullColour: colour.checked && colourBg.checked && fullColour.checked
  });
  const heroCfg = (): ArtCfg => heroColour.checked ? {
    columns: maxColumns, contrast: 0.55, detail: 1.2, bias: 0.25, dither: "atkinson", invert: true,
    colour: true, colourBackground: heroBg.checked, fullColour: heroBg.checked && heroFull.checked
  } : {
    columns: 96, contrast: 1.12, detail: 0.34, bias: 0.015, dither: "ordered", invert: true,
    colour: false, colourBackground: false, fullColour: false
  };

  const syncColour = (): void => {
    colourBg.disabled = !colour.checked;
    fullColour.disabled = !colour.checked || !colourBg.checked;
  };
  const syncHeroColour = (): void => {
    heroBg.disabled = !heroColour.checked;
    heroFull.disabled = !heroColour.checked || !heroBg.checked;
  };

  const generateMaker = (): void => {
    if (!vector) return;
    const next = makeArt(vector.pixels, makerCfg());
    art = next;
    renderDense(output, next);
    metrics.textContent = `${next.columns}×${next.rows} cells · ${(next.density * 100).toFixed(1)}% dots · ${vector.paths} paths${next.cellColours ? " · colour" : ""}`;
    setStatus("Ready");
  };

  const generateHero = (): void => {
    if (!heroPixels) return;
    const next = makeArt(heroPixels, heroCfg());
    renderDense(heroUnicode, next);
  };

  const applyThemeDefaults = (theme: Theme): void => {
    const light = theme === "light";
    heroBg.checked = light;
    heroFull.checked = false;
    invert.checked = !light;
    syncHeroColour();
    if (heroPixels) generateHero();
    if (vector) generateMaker();
  };

  const loadMaker = async (source: Blob | string, nextName: string, seedHero = false): Promise<void> => {
    const local = ++loadGeneration;
    setStatus("Reading image…", true);
    const decoded = await decodeImage(source);
    if (local !== loadGeneration) { if (decoded.revoke) URL.revokeObjectURL(decoded.url); return; }
    name = nextName;
    setStatus("Vectorising…", true);
    await new Promise(requestAnimationFrame);
    const nextVector = vectorStage(decoded.pixels, { colours: 64, alphaLevels: 16 });
    if (local !== loadGeneration) { if (decoded.revoke) URL.revokeObjectURL(decoded.url); return; }
    vector = nextVector;
    if (seedHero) {
      heroPixels = nextVector.pixels;
      if (heroObjectUrl) URL.revokeObjectURL(heroObjectUrl);
      heroImg.src = decoded.url;
      heroObjectUrl = decoded.revoke ? decoded.url : null;
      generateHero();
    } else if (decoded.revoke) URL.revokeObjectURL(decoded.url);
    generateMaker();
  };

  let debounce = 0;
  const schedule = (): void => { window.clearTimeout(debounce); debounce = window.setTimeout(generateMaker, 90); };
  for (const control of [columns, contrast, detail, bias, dither, invert]) control.addEventListener("input", schedule);
  colour.addEventListener("change", () => {
    dither.value = colour.checked ? "atkinson" : "ordered";
    if (colour.checked) { colourBg.checked = false; fullColour.checked = false; }
    syncColour(); schedule();
  });
  for (const control of [colourBg, fullColour]) control.addEventListener("change", () => { syncColour(); schedule(); });
  for (const control of [heroColour, heroBg, heroFull]) control.addEventListener("change", () => { syncHeroColour(); generateHero(); });
  columns.addEventListener("input", () => { columnsOut.value = columns.value; });
  addEventListener("unicode-art-theme", event => {
    const theme = (event as CustomEvent<Theme>).detail;
    if (theme === "light" || theme === "dark") applyThemeDefaults(theme);
  });

  upload.addEventListener("change", () => { const file = upload.files?.[0]; if (file) void loadMaker(file, file.name.replace(/\.[^.]+$/, "")); });
  drop.addEventListener("dragover", event => { event.preventDefault(); drop.dataset.drag = "true"; });
  drop.addEventListener("dragleave", () => delete drop.dataset.drag);
  drop.addEventListener("drop", event => { event.preventDefault(); delete drop.dataset.drag; const file = event.dataTransfer?.files?.[0]; if (file?.type === "image/png") void loadMaker(file, file.name.replace(/\.[^.]+$/, "")); });

  const textOutput = (): string => art ? (art.cellColours ? taggedText(art) : art.text) : "";
  copy.addEventListener("click", async () => { if (!art) return; await navigator.clipboard.writeText(textOutput()); const old = copy.textContent; copy.textContent = "Copied"; setTimeout(() => { copy.textContent = old; }, 900); });
  txt.addEventListener("click", () => art && download(`${name}.txt`, "text/plain;charset=utf-8", `${textOutput()}\n`));
  html.addEventListener("click", () => art && download(`${name}.html`, "text/html;charset=utf-8", denseHtml(art, name, 0.02)));
  svg.addEventListener("click", () => vector?.svg && download(`${name}.svg`, "image/svg+xml;charset=utf-8", vector.svg));

  bindCompare(compare, divider);
  bindTooltips();
  const observer = new ResizeObserver(() => { fitDense(heroUnicode); fitDense(output); });
  observer.observe(compare);
  if (output.parentElement) observer.observe(output.parentElement);
  syncColour();
  applyThemeDefaults(activeTheme());
  void loadMaker("assets/hero.png", "hero", true);
};
