import type { CellColour, Pixels, Rgb } from "../types.ts";
import { labDist, meanColour, meanLab, rgbToLab, sample, type Sample } from "./space.ts";

const slots = [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[0,3],[1,3]] as const;

export interface ColourResult { readonly dots: Uint8Array; readonly cells: readonly CellColour[]; }

const samplesFor = (pixels: Pixels, x: number, y: number): Sample[] => {
  const out: Sample[] = [];
  for (let slot = 0; slot < slots.length; slot += 1) {
    const [dx, dy] = slots[slot] ?? [0, 0];
    const i = ((y + dy) * pixels.width + x + dx) * 4;
    out.push(sample(pixels.data[i] ?? 0, pixels.data[i + 1] ?? 0, pixels.data[i + 2] ?? 0, (pixels.data[i + 3] ?? 0) / 255, slot));
  }
  return out;
};

const writeMask = (dots: Uint8Array, width: number, x: number, y: number, on: ReadonlySet<number>): void => {
  for (let slot = 0; slot < slots.length; slot += 1) {
    const [dx, dy] = slots[slot] ?? [0, 0];
    dots[(y + dy) * width + x + dx] = on.has(slot) ? 1 : 0;
  }
};

const baseOn = (dots: Uint8Array, width: number, x: number, y: number): Set<number> => {
  const out = new Set<number>();
  for (let slot = 0; slot < slots.length; slot += 1) {
    const [dx, dy] = slots[slot] ?? [0, 0];
    if (dots[(y + dy) * width + x + dx]) out.add(slot);
  }
  return out;
};

const cell = (fg?: Rgb, bg?: Rgb): CellColour => ({ ...(fg ? { fg } : {}), ...(bg ? { bg } : {}) });

const ordinary = (samples: readonly Sample[], on: ReadonlySet<number>, background: boolean): CellColour => {
  const fg = meanColour(samples.filter(s => on.has(s.slot) && s.alpha > 0.04));
  const bg = background ? meanColour(samples.filter(s => !on.has(s.slot) && s.alpha > 0.04)) : undefined;
  return cell(fg, bg);
};

const farthestPair = (samples: readonly Sample[]): [Sample, Sample, number] => {
  let a = samples[0]!, b = samples[0]!, best = -1;
  for (let i = 0; i < samples.length; i += 1) for (let j = i + 1; j < samples.length; j += 1) {
    const d = labDist(samples[i]!.lab, samples[j]!.lab);
    if (d > best) { a = samples[i]!; b = samples[j]!; best = d; }
  }
  return [a, b, Math.max(0, best)];
};

const full = (samples: readonly Sample[], base: ReadonlySet<number>): { on: Set<number>; colour: CellColour } => {
  const visible = samples.filter(s => s.alpha > 0.08);
  if (!visible.length) return { on: new Set(), colour: {} };

  if (visible.length < 8) {
    const on = new Set(visible.filter(s => s.alpha >= 0.22).map(s => s.slot));
    return { on, colour: cell(meanColour(visible)) };
  }

  const [seedA, seedB, spread] = farthestPair(visible);
  if (spread < 0.055) {
    const one = meanColour(visible);
    return { on: new Set(base), colour: cell(one, one) };
  }

  let ca = seedA.lab, cb = seedB.lab;
  let groupA: Sample[] = [], groupB: Sample[] = [];
  for (let pass = 0; pass < 5; pass += 1) {
    groupA = []; groupB = [];
    for (const s of visible) (labDist(s.lab, ca) <= labDist(s.lab, cb) ? groupA : groupB).push(s);
    if (!groupA.length || !groupB.length) break;
    ca = meanLab(groupA); cb = meanLab(groupB);
  }
  if (!groupA.length || !groupB.length) {
    const one = meanColour(visible);
    return { on: new Set(base), colour: cell(one, one) };
  }

  const aSlots = new Set(groupA.map(s => s.slot));
  let agreeA = 0;
  for (let slot = 0; slot < 8; slot += 1) if (aSlots.has(slot) === base.has(slot)) agreeA += 1;
  const useA = agreeA >= 4;
  const on = useA ? aSlots : new Set(groupB.map(s => s.slot));
  const fg = meanColour(useA ? groupA : groupB);
  const bg = meanColour(useA ? groupB : groupA);
  if (fg && bg && labDist(rgbToLab(fg), rgbToLab(bg)) < 0.025) {
    const one = meanColour(visible);
    return { on: new Set(base), colour: cell(one, one) };
  }
  return { on, colour: cell(fg, bg) };
};

export const colourCells = (pixels: Pixels, baseDots: Uint8Array, background: boolean, fullColour: boolean): ColourResult => {
  const dots = baseDots.slice();
  const cells: CellColour[] = [];
  for (let y = 0; y < pixels.height; y += 4) for (let x = 0; x < pixels.width; x += 2) {
    const source = samplesFor(pixels, x, y);
    const base = baseOn(baseDots, pixels.width, x, y);
    if (fullColour && background) {
      const next = full(source, base);
      writeMask(dots, pixels.width, x, y, next.on);
      cells.push(next.colour);
    } else {
      cells.push(ordinary(source, base, background));
    }
  }
  return { dots, cells };
};
