#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { PNG } from "pngjs";
import { taggedText, taggedToAnsi } from "./colour/tagged.ts";
import { parseArgs } from "./cli/args.ts";
import { writeOutput } from "./cli/output.ts";
import { makeArt } from "./core/art.ts";
import { denseHtml } from "./html/dense.ts";
import { vectorStage } from "./vector/stage.ts";

const args = parseArgs(process.argv.slice(2));
const png = PNG.sync.read(await readFile(args.input));
const vector = vectorStage({ width: png.width, height: png.height, data: png.data }, { colours: 64, alphaLevels: 16 });
const art = makeArt(vector.pixels, args.art);
if (args.svg) await writeFile(args.svg, vector.svg, "utf8");
const title = basename(args.input, extname(args.input));
const tagged = art.cellColours ? taggedText(art) : art.text;
const body = args.html ? denseHtml(art, title) : args.ansi ? `${taggedToAnsi(tagged)}\n` : `${tagged}\n`;
await writeOutput(args.output, body);
