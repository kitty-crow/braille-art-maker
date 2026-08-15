import source from "./packs/original-ln-v1.xml" with { type: "text" };
import { parseCorpusXml } from "./corpus.ts";

export const originalLnCorpus = parseCorpusXml(source);
