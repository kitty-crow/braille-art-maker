import type { EmbedSurface, EmbedTheme } from "../embed/types.ts";
import type { ArtCfg, Dither } from "../types.ts";

export interface CliArgs {
  readonly input: string;
  readonly output?: string;
  readonly svg?: string;
  readonly html: boolean;
  readonly ansi: boolean;
  readonly embed: boolean;
  readonly embedSrc?: string;
  readonly embedTheme: EmbedTheme;
  readonly embedSurface: EmbedSurface;
  readonly art: ArtCfg;
}

const help = `Unicode Art Maker\n\nUsage: unicode-art image.png [options]\n\n  --columns N           Unicode columns (8-1024, default 96)\n  --dither MODE         atkinson|floyd|ordered|threshold (default ordered)\n  --contrast N          contrast multiplier\n  --detail N            local detail amount\n  --bias N              threshold bias\n  --invert              use inverted polarity (default)\n  --no-invert           disable inverted polarity\n  --colour              colour foreground dots\n  --colour-background   colour foreground and background\n  --full-colour         two-colour adaptive Unicode cells\n  --ansi                emit ANSI truecolour instead of tags\n  --html                write self-contained HTML\n  --embed               write a paste-ready CDN embed div\n  --embed-src URL       use a different embed.js location\n  --embed-theme MODE    auto|light|dark (default auto)\n  --embed-surface MODE  auto|light|dark (default auto)\n  --svg FILE            also write Vectoriser intermediate\n  -o, --output FILE     output file (stdout by default)`;

const valued = new Set(["--columns", "--dither", "--contrast", "--detail", "--bias", "--embed-src", "--embed-theme", "--embed-surface", "--svg", "--output", "-o"]);

const inputArg = (args: readonly string[]): string => {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (valued.has(arg)) { i += 1; continue; }
    if (!arg.startsWith("-")) return arg;
  }
  return "";
};

const embedTheme = (raw: string | undefined): EmbedTheme => raw === "light" || raw === "dark" ? raw : "auto";
const embedSurface = (raw: string | undefined): EmbedSurface => raw === "light" || raw === "dark" ? raw : "auto";

export const parseArgs = (args: readonly string[]): CliArgs => {
  const input = inputArg(args);
  if (!input || args.includes("--help") || args.includes("-h")) { console.log(help); process.exit(input ? 0 : 1); }
  const value = (flag: string): string | undefined => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const number = (flag: string, fallback: number): number => Number(value(flag) ?? fallback);
  const output = value("--output") ?? value("-o"), svg = value("--svg"), embedSrc = value("--embed-src");
  const invert = args.includes("--invert") || !args.includes("--no-invert");
  const fullColour = args.includes("--full-colour"), colourBackground = fullColour || args.includes("--colour-background"), colour = colourBackground || args.includes("--colour");
  return {
    input,
    ...(output ? { output } : {}),
    ...(svg ? { svg } : {}),
    ...(embedSrc ? { embedSrc } : {}),
    html: args.includes("--html"),
    ansi: args.includes("--ansi"),
    embed: args.includes("--embed"),
    embedTheme: embedTheme(value("--embed-theme")),
    embedSurface: embedSurface(value("--embed-surface")),
    art: { columns: number("--columns", 96), contrast: number("--contrast", 1.12), detail: number("--detail", 0.34), bias: number("--bias", 0.015), dither: (value("--dither") ?? "ordered") as Dither, invert, colour, colourBackground, fullColour }
  };
};
