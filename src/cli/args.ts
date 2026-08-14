import type { ArtCfg, Dither } from "../types.ts";

export interface CliArgs { readonly input: string; readonly output?: string; readonly svg?: string; readonly html: boolean; readonly ansi: boolean; readonly art: ArtCfg; }

const help = `Braille Art Maker\n\nUsage: braille-art image.png [options]\n\n  --columns N           Braille columns (default 96)\n  --dither MODE         atkinson|floyd|ordered|threshold (default ordered)\n  --contrast N          contrast multiplier\n  --detail N            local detail amount\n  --bias N              threshold bias\n  --invert              use inverted polarity (default)\n  --no-invert           disable inverted polarity\n  --colour              colour foreground Braille dots\n  --colour-background   colour foreground and background\n  --full-colour         two-colour adaptive Braille cells\n  --ansi                emit ANSI truecolour instead of tags\n  --html                write self-contained HTML\n  --svg FILE            also write Vectoriser intermediate\n  -o, --output FILE     output file (stdout by default)`;

export const parseArgs = (args: readonly string[]): CliArgs => {
  const input = args.find(arg => !arg.startsWith("-")) ?? "";
  if (!input || args.includes("--help") || args.includes("-h")) { console.log(help); process.exit(input ? 0 : 1); }
  const value = (flag: string): string | undefined => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const number = (flag: string, fallback: number): number => Number(value(flag) ?? fallback);
  const output = value("--output") ?? value("-o"), svg = value("--svg");
  const invert = args.includes("--invert") || !args.includes("--no-invert");
  const fullColour = args.includes("--full-colour"), colourBackground = fullColour || args.includes("--colour-background"), colour = colourBackground || args.includes("--colour");
  return {
    input, ...(output ? { output } : {}), ...(svg ? { svg } : {}), html: args.includes("--html"), ansi: args.includes("--ansi"),
    art: { columns: number("--columns", 96), contrast: number("--contrast", 1.12), detail: number("--detail", 0.34), bias: number("--bias", 0.015), dither: (value("--dither") ?? "ordered") as Dither, invert, colour, colourBackground, fullColour }
  };
};
