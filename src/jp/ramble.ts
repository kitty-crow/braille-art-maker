import type { CorpusEntry, CorpusPack } from "./corpus.ts";

export interface Entropy { take(limit: number): number; }

export const entropy13 = (values: readonly number[]): Entropy => {
  if (values.length === 0) throw new Error("Japanese ramble requires at least one entropy value.");
  let at = 0;
  let round = 0;
  return { take(limit: number): number {
    if (!Number.isInteger(limit) || limit <= 0) throw new Error("Entropy choice limit must be a positive integer.");
    const value = values[at]!;
    at += 1;
    if (at >= values.length) { at = 0; round += 1; }
    const mixed = (value ^ Math.imul(round + 1, 0x9e37) ^ Math.imul(at + 11, 0x45d9)) >>> 0;
    return mixed % limit;
  } };
};

const byKind = (pack: CorpusPack, kind: CorpusEntry["kind"]): readonly CorpusEntry[] => {
  const values = pack.entries.filter(entry => entry.kind === kind);
  if (values.length === 0) throw new Error(`Japanese corpus has no ${kind} entries.`);
  return values;
};
const pick = (entropy: Entropy, values: readonly CorpusEntry[]): CorpusEntry => values[entropy.take(values.length)]!;
const text = (entropy: Entropy, values: readonly CorpusEntry[]): string => pick(entropy, values).text;
interface Lexicon { readonly nouns: readonly CorpusEntry[]; readonly people: readonly CorpusEntry[]; readonly places: readonly CorpusEntry[]; readonly objects: readonly CorpusEntry[]; readonly verbs: readonly CorpusEntry[]; readonly adjectives: readonly CorpusEntry[]; readonly connectors: readonly CorpusEntry[]; readonly dialogue: readonly CorpusEntry[]; }
const lexicon = (pack: CorpusPack): Lexicon => ({ nouns: byKind(pack, "noun"), people: byKind(pack, "person"), places: byKind(pack, "place"), objects: byKind(pack, "object"), verbs: byKind(pack, "verb"), adjectives: byKind(pack, "adjective"), connectors: byKind(pack, "connector"), dialogue: byKind(pack, "dialogue") });
const tagged = (values: readonly CorpusEntry[], tag: string): readonly CorpusEntry[] => { const found = values.filter(value => value.tags.includes(tag)); return found.length > 0 ? found : values; };
const verbForm = (entry: CorpusEntry, entropy: Entropy): string => { const forms = entry.text.split("|"); return forms[entropy.take(forms.length)]!; };
const adjective = (entry: CorpusEntry, noun: string): string => { const [plain, cls] = entry.text.split("|"); return cls === "na" ? `${plain}な${noun}` : `${plain}${noun}`; };
const subject = (e: Entropy, l: Lexicon): string => text(e, e.take(4) === 0 ? l.nouns : l.people);
const object = (e: Entropy, l: Lexicon): string => text(e, l.objects);
const place = (e: Entropy, l: Lexicon): string => text(e, l.places);
const decoratedObject = (e: Entropy, l: Lexicon): string => adjective(pick(e, l.adjectives), object(e, l));
const simpleTransitive = (e: Entropy, l: Lexicon): string => { const s = subject(e, l); const p = place(e, l); const o = decoratedObject(e, l); const v = verbForm(pick(e, tagged(l.verbs, "transitive")), e); return `${s}${e.take(3) === 0 ? "が" : "は"}${p}で${o}を${v}。`; };
const motion = (e: Entropy, l: Lexicon): string => { const s = subject(e, l); const p = place(e, l); const v = verbForm(pick(e, tagged(l.verbs, "motion")), e); return `${s}は${p}${e.take(3) === 0 ? "へ" : "に"}${v}。`; };
const causal = (e: Entropy, l: Lexicon): string => { const a = simpleTransitive(e, l).slice(0, -1); const s = subject(e, l); const p = place(e, l); const v = verbForm(pick(e, tagged(l.verbs, "intransitive")), e); return `${a}ので、${s}は${p}で${v}。`; };
const contrast = (e: Entropy, l: Lexicon): string => `${motion(e, l).slice(0, -1)}のに、${simpleTransitive(e, l)}`;
const quote = (e: Entropy, l: Lexicon): string => { const s = subject(e, l); const line = text(e, l.dialogue); const v = e.take(3) === 0 ? "つぶやいた" : e.take(2) === 0 ? "言った" : "答えた"; return `「${line}」と${s}は${v}。`; };
const chained = (e: Entropy, l: Lexicon): string => { const s = subject(e, l); const p = place(e, l); const o = object(e, l); const v = verbForm(pick(e, tagged(l.verbs, "transitive")), e); const c = text(e, l.connectors); return `${p}で${o}を探しながら、${s}は${v}。${c}、${motion(e, l)}`; };
const frames = [simpleTransitive, motion, causal, contrast, quote, chained] as const;
export interface RambleOptions { readonly sentences?: number; }
export const japaneseRamble = (pack: CorpusPack, entropy: Entropy, options: RambleOptions = {}): string => { const l = lexicon(pack); const count = Math.max(1, Math.min(64, Math.round(options.sentences ?? 12))); const out: string[] = []; for (let i = 0; i < count; i += 1) out.push(frames[entropy.take(frames.length)]!(entropy, l)); return out.join("\n"); };
