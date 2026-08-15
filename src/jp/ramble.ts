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
const pick = (e: Entropy, values: readonly CorpusEntry[]): CorpusEntry => values[e.take(values.length)]!;
const text = (e: Entropy, values: readonly CorpusEntry[]): string => pick(e, values).text;
interface Lexicon { readonly nouns: readonly CorpusEntry[]; readonly people: readonly CorpusEntry[]; readonly places: readonly CorpusEntry[]; readonly objects: readonly CorpusEntry[]; readonly verbs: readonly CorpusEntry[]; readonly adjectives: readonly CorpusEntry[]; readonly connectors: readonly CorpusEntry[]; readonly dialogue: readonly CorpusEntry[]; }
const lexicon = (pack: CorpusPack): Lexicon => ({ nouns: byKind(pack, "noun"), people: byKind(pack, "person"), places: byKind(pack, "place"), objects: byKind(pack, "object"), verbs: byKind(pack, "verb"), adjectives: byKind(pack, "adjective"), connectors: byKind(pack, "connector"), dialogue: byKind(pack, "dialogue") });
const tagged = (values: readonly CorpusEntry[], tag: string): readonly CorpusEntry[] => { const found = values.filter(value => value.tags.includes(tag)); return found.length > 0 ? found : values; };
const verbForm = (entry: CorpusEntry, e: Entropy): string => { const forms = entry.text.split("|"); return forms[e.take(forms.length)]!; };
const adjective = (entry: CorpusEntry, noun: string): string => { const [plain, cls] = entry.text.split("|"); return cls === "na" ? `${plain}な${noun}` : `${plain}${noun}`; };
const person = (e: Entropy, l: Lexicon): string => text(e, l.people);
const subject = (e: Entropy, l: Lexicon): string => text(e, e.take(4) === 0 ? l.nouns : l.people);
const object = (e: Entropy, l: Lexicon): string => text(e, l.objects);
const place = (e: Entropy, l: Lexicon): string => text(e, l.places);
const line = (e: Entropy, l: Lexicon): string => text(e, l.dialogue);
const connector = (e: Entropy, l: Lexicon): string => text(e, l.connectors);
const decoratedObject = (e: Entropy, l: Lexicon): string => adjective(pick(e, l.adjectives), object(e, l));
const transitive = (e: Entropy, l: Lexicon): string => verbForm(pick(e, tagged(l.verbs, "transitive")), e);
const motionVerb = (e: Entropy, l: Lexicon): string => verbForm(pick(e, tagged(l.verbs, "motion")), e);
const intransitive = (e: Entropy, l: Lexicon): string => verbForm(pick(e, tagged(l.verbs, "intransitive")), e);

type Frame = (e: Entropy, l: Lexicon) => string;

const simpleTransitive: Frame = (e, l) => `${subject(e, l)}${e.take(3) === 0 ? "が" : "は"}${place(e, l)}で${decoratedObject(e, l)}を${transitive(e, l)}。`;
const motion: Frame = (e, l) => `${subject(e, l)}は${place(e, l)}へ${motionVerb(e, l)}。`;
const causal: Frame = (e, l) => `${simpleTransitive(e, l).slice(0, -1)}ので、${subject(e, l)}は${place(e, l)}で${intransitive(e, l)}。`;
const contrast: Frame = (e, l) => `${motion(e, l).slice(0, -1)}のに、${simpleTransitive(e, l)}`;
const quote: Frame = (e, l) => `「${line(e, l)}」と${subject(e, l)}は${e.take(3) === 0 ? "つぶやいた" : e.take(2) === 0 ? "言った" : "答えた"}。`;
const chained: Frame = (e, l) => `${place(e, l)}で${object(e, l)}を探しながら、${subject(e, l)}は${transitive(e, l)}。${connector(e, l)}、${motion(e, l)}`;
const discoveryQuote: Frame = (e, l) => `${object(e, l)}を見つけると、${person(e, l)}は「${line(e, l)}」と言った。`;
const hearsay: Frame = (e, l) => `${person(e, l)}によれば、${object(e, l)}は${place(e, l)}にあるらしい。`;
const listing: Frame = (e, l) => `${place(e, l)}では、${person(e, l)}が${object(e, l)}を調べたり、${person(e, l)}が${object(e, l)}を隠したりしていた。`;
const relativeClause: Frame = (e, l) => `${person(e, l)}が${place(e, l)}で見つけた${object(e, l)}を、${person(e, l)}は${transitive(e, l)}。`;
const conditional: Frame = (e, l) => `もし${object(e, l)}が本物なら、${person(e, l)}は${place(e, l)}へ行くつもりだった。`;
const missingCause: Frame = (e, l) => `${object(e, l)}が見つからなかったため、${person(e, l)}は${place(e, l)}へ向かった。`;
const topicShift: Frame = (e, l) => `${object(e, l)}については、${person(e, l)}もまだ何も知らなかった。`;
const concession: Frame = (e, l) => `${object(e, l)}は大切なもののはずなのに、${person(e, l)}は${place(e, l)}に置き忘れていた。`;
const simultaneous: Frame = (e, l) => `${object(e, l)}を探しているあいだ、${person(e, l)}は${place(e, l)}で${decoratedObject(e, l)}を${transitive(e, l)}。`;
const apparent: Frame = (e, l) => `${place(e, l)}から${object(e, l)}が消えたらしく、${person(e, l)}はしばらく黙っていた。`;
const comparison: Frame = (e, l) => `${person(e, l)}は${object(e, l)}よりも${object(e, l)}のほうを気にしていた。`;
const purpose: Frame = (e, l) => `${object(e, l)}を確かめるために、${person(e, l)}は${place(e, l)}へ向かった。`;
const before: Frame = (e, l) => `${person(e, l)}が${place(e, l)}へ戻る前に、${object(e, l)}は誰かに持ち去られていた。`;
const evenIf: Frame = (e, l) => `${object(e, l)}が偽物でも、${person(e, l)}は気にしないらしい。`;

const frames: readonly Frame[] = [
  simpleTransitive, motion, causal, contrast, quote, chained, discoveryQuote, hearsay, listing,
  relativeClause, conditional, missingCause, topicShift, concession, simultaneous, apparent,
  comparison, purpose, before, evenIf,
];

export interface RambleOptions { readonly sentences?: number; }
export const japaneseRamble = (pack: CorpusPack, entropy: Entropy, options: RambleOptions = {}): string => {
  const l = lexicon(pack);
  const count = Math.max(1, Math.min(64, Math.round(options.sentences ?? 12)));
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) out.push(frames[entropy.take(frames.length)]!(entropy, l));
  return out.join("\n");
};
