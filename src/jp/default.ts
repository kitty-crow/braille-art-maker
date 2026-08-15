import base from "./packs/original-ln-v1.xml" with { type: "text" };
import courtMystery from "./packs/original-ln-court-mystery-v1.xml" with { type: "text" };
import romanceBooksMagic from "./packs/original-ln-romance-books-magic-v1.xml" with { type: "text" };
import silentWitch from "./packs/original-ln-silent-witch-v1.xml" with { type: "text" };
import templates from "./packs/original-ln-templates-v1.xml" with { type: "text" };
import { mergeCorpusPacks, parseCorpusXml } from "./corpus.ts";

/*
 * Frozen synthetic compatibility tables.
 *
 * These entries were historically generated/hand-authored rather than taken
 * from traceable published prose. They MUST NOT be used for new story
 * encodes. They remain here only so already-generated v1/v2 payloads keep
 * decoding byte-for-byte.
 */
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

export const originalLnCorpusV2 = mergeCorpusPacks("original-ln-v2", [
  basePack,
  courtMysteryPack,
  romanceBooksMagicPack,
  silentWitchPack,
  templatePack,
]);
