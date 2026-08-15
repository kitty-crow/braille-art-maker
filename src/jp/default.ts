import base from "./packs/original-ln-v1.xml" with { type: "text" };
import courtMystery from "./packs/original-ln-court-mystery-v1.xml" with { type: "text" };
import romanceBooksMagic from "./packs/original-ln-romance-books-magic-v1.xml" with { type: "text" };
import { mergeCorpusPacks, parseCorpusXml } from "./corpus.ts";

export const originalLnCorpus = mergeCorpusPacks("original-ln-v1", [
  parseCorpusXml(base),
  parseCorpusXml(courtMystery),
  parseCorpusXml(romanceBooksMagic),
]);
