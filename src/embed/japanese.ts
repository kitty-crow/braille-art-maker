import { originalLnCorpus } from "../jp/default.ts";
import type { CorpusEntry } from "../jp/corpus.ts";

export type JapaneseCompactMode = "r" | "d" | "b";
export interface JapaneseCompactPayload { readonly mode: JapaneseCompactMode; readonly bytes: Uint8Array; }

export const japaneseCompactPrefix = "物語は、ここから始まる。";

const tokenRx = /\{([A-Za-z][A-Za-z0-9]*)\}/gu;
const escapeRx = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const byKind = (kind: CorpusEntry["kind"]): readonly CorpusEntry[] => originalLnCorpus.entries.filter(entry => entry.kind === kind);
const unique = (values: readonly string[], label: string): readonly string[] => {
  const out = [...new Set(values)];
  if (out.length !== values.length) throw new Error(`Japanese compact ${label} choices must be unique.`);
  if (out.length < 2) throw new Error(`Japanese compact ${label} needs at least two choices.`);
  return out;
};
const texts = (kind: CorpusEntry["kind"]): readonly string[] => unique(byKind(kind).map(entry => entry.text), kind);
const verbs = (tag: string, allForms: boolean): readonly string[] => unique(
  byKind("verb")
    .filter(entry => entry.tags.includes(tag))
    .flatMap(entry => allForms ? entry.text.split("|") : [entry.text.split("|")[0]!]),
  `${tag} verbs`,
);

const adjectiveObject = (): readonly string[] => {
  const adjectives = byKind("adjective").map(entry => {
    const [plain, cls] = entry.text.split("|");
    return cls === "na" ? `${plain}な` : plain ?? "";
  });
  const objects = texts("object");
  return unique(adjectives.flatMap(adjective => objects.map(object => `${adjective}${object}`)), "decorated objects");
};

const optionCache = new Map<string, readonly string[]>();
const optionsFor = (token: string): readonly string[] => {
  const cached = optionCache.get(token);
  if (cached) return cached;
  let values: readonly string[];
  switch (token) {
    case "person": values = texts("person"); break;
    case "subject": values = unique([...texts("person"), ...texts("noun")], "subjects"); break;
    case "place": case "place2": values = texts("place"); break;
    case "object": case "object2": values = texts("object"); break;
    case "dialogue": values = texts("dialogue"); break;
    case "connector": values = texts("connector"); break;
    case "transitive": values = verbs("transitive", true); break;
    case "transitiveDict": values = verbs("transitive", false); break;
    case "motion": values = verbs("motion", true); break;
    case "motionDict": values = verbs("motion", false); break;
    case "intransitive": values = verbs("intransitive", true); break;
    case "decoratedObject": values = adjectiveObject(); break;
    default: throw new Error(`Unsupported Japanese compact template token: ${token}`);
  }
  optionCache.set(token, values);
  return values;
};

interface TemplateSpec {
  readonly id: string;
  readonly text: string;
  readonly tokens: readonly string[];
  readonly regex: RegExp;
}

const compileTemplate = (entry: CorpusEntry): TemplateSpec => {
  const tokens: string[] = [];
  let pattern = "^";
  let at = 0;
  for (const match of entry.text.matchAll(tokenRx)) {
    const index = match.index ?? 0;
    pattern += escapeRx(entry.text.slice(at, index));
    const token = match[1]!;
    const choices = [...optionsFor(token)].sort((a, b) => b.length - a.length).map(escapeRx);
    pattern += `(${choices.join("|")})`;
    tokens.push(token);
    at = index + match[0].length;
  }
  pattern += escapeRx(entry.text.slice(at));
  if (tokens.length === 0) throw new Error(`Japanese compact template ${entry.id} has no data slots.`);
  return { id: entry.id, text: entry.text, tokens, regex: new RegExp(pattern, "u") };
};

const templates = byKind("template").map(compileTemplate);
if (templates.length < 2) throw new Error("Japanese compact needs at least two grammar templates.");

const optionIndex = new Map<string, ReadonlyMap<string, number>>();
const indexFor = (token: string, value: string): number => {
  let map = optionIndex.get(token);
  if (!map) {
    map = new Map(optionsFor(token).map((choice, index) => [choice, index] as const));
    optionIndex.set(token, map);
  }
  const index = map.get(value);
  if (index === undefined) throw new Error(`Japanese compact could not decode ${token} choice.`);
  return index;
};

const modeByte = (mode: JapaneseCompactMode): number => mode === "r" ? 0 : mode === "d" ? 1 : 2;
const modeFromByte = (value: number): JapaneseCompactMode => {
  if (value === 0) return "r";
  if (value === 1) return "d";
  if (value === 2) return "b";
  throw new Error("Japanese compact payload has an invalid compression mode.");
};

const stateFrom = (mode: JapaneseCompactMode, bytes: Uint8Array): bigint => {
  let value = BigInt(modeByte(mode));
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  const length = bytes.length + 1;
  return (1n << BigInt(length * 8)) | value;
};

const stateTo = (state: bigint): JapaneseCompactPayload => {
  if (state <= 0n) throw new Error("Japanese compact payload has no encoded state.");
  const bitLength = state.toString(2).length;
  if ((bitLength - 1) % 8 !== 0) throw new Error("Japanese compact payload has invalid byte framing.");
  const length = (bitLength - 1) / 8;
  if (length < 1) throw new Error("Japanese compact payload is missing its compression mode.");
  let value = state - (1n << BigInt(length * 8));
  const framed = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i -= 1) {
    framed[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return { mode: modeFromByte(framed[0]!), bytes: framed.slice(1) };
};

const takeDigit = (state: bigint, radix: number): { readonly digit: number; readonly state: bigint } => ({
  digit: Number(state % BigInt(radix)),
  state: state / BigInt(radix),
});

const renderTemplate = (spec: TemplateSpec, start: bigint): { readonly text: string; readonly state: bigint } => {
  let state = start;
  let out = "";
  let at = 0;
  for (const match of spec.text.matchAll(tokenRx)) {
    const index = match.index ?? 0;
    out += spec.text.slice(at, index);
    const token = match[1]!;
    const choices = optionsFor(token);
    const next = takeDigit(state, choices.length);
    out += choices[next.digit]!;
    state = next.state;
    at = index + match[0].length;
  }
  out += spec.text.slice(at);
  return { text: out, state };
};

export const encodeJapaneseCompact = (mode: JapaneseCompactMode, bytes: Uint8Array): string => {
  let state = stateFrom(mode, bytes);
  let out = japaneseCompactPrefix;
  while (state > 0n) {
    const chosen = takeDigit(state, templates.length);
    state = chosen.state;
    const rendered = renderTemplate(templates[chosen.digit]!, state);
    out += rendered.text;
    state = rendered.state;
  }
  return out;
};

interface MatchedTemplate { readonly index: number; readonly spec: TemplateSpec; readonly match: RegExpExecArray; }
const matchTemplate = (source: string): MatchedTemplate => {
  const found: MatchedTemplate[] = [];
  for (let index = 0; index < templates.length; index += 1) {
    const spec = templates[index]!;
    const match = spec.regex.exec(source);
    if (match) found.push({ index, spec, match });
  }
  if (found.length === 0) throw new Error("Japanese compact payload contains an unrecognised sentence.");
  found.sort((a, b) => b.match[0].length - a.match[0].length);
  if (found[1] && found[1].match[0].length === found[0]!.match[0].length) {
    throw new Error("Japanese compact payload contains an ambiguous sentence.");
  }
  return found[0]!;
};

export const isJapaneseCompactPayload = (source: string): boolean => source.startsWith(japaneseCompactPrefix);

export const decodeJapaneseCompact = (source: string): JapaneseCompactPayload => {
  if (!isJapaneseCompactPayload(source)) throw new Error("Japanese compact payload header is missing.");
  if (/[\r\n]/u.test(source)) throw new Error("Japanese compact payload must be a single line.");
  let at = japaneseCompactPrefix.length;
  let state = 0n;
  let factor = 1n;
  const addDigit = (digit: number, radix: number): void => {
    state += BigInt(digit) * factor;
    factor *= BigInt(radix);
  };

  while (at < source.length) {
    const found = matchTemplate(source.slice(at));
    addDigit(found.index, templates.length);
    for (let i = 0; i < found.spec.tokens.length; i += 1) {
      const token = found.spec.tokens[i]!;
      const choice = found.match[i + 1]!;
      const options = optionsFor(token);
      addDigit(indexFor(token, choice), options.length);
    }
    at += found.match[0].length;
  }
  return stateTo(state);
};
