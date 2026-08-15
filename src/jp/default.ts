import base from "./packs/original-ln-v1.xml" with { type: "text" };
import courtMystery from "./packs/original-ln-court-mystery-v1.xml" with { type: "text" };
import romanceBooksMagic from "./packs/original-ln-romance-books-magic-v1.xml" with { type: "text" };
import silentWitch from "./packs/original-ln-silent-witch-v1.xml" with { type: "text" };
import templates from "./packs/original-ln-templates-v1.xml" with { type: "text" };
import { mergeCorpusPacks, parseCorpusXml } from "./corpus.ts";

const basePack = parseCorpusXml(base);
const courtMysteryPack = parseCorpusXml(courtMystery);
const romanceBooksMagicPack = parseCorpusXml(romanceBooksMagic);
const silentWitchPack = parseCorpusXml(silentWitch);
const templatePack = parseCorpusXml(templates);

export const originalLnCorpusV1 = mergeCorpusPacks("original-ln-v1", [
  basePack,
  courtMysteryPack,
  romanceBooksMagicPack,
  templatePack,
]);

export const originalLnCorpus = mergeCorpusPacks("original-ln-v2", [
  basePack,
  courtMysteryPack,
  romanceBooksMagicPack,
  silentWitchPack,
  templatePack,
]);
