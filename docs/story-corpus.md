# Story corpus provenance

The active **Payload as a story** corpus must contain real published Japanese prose with traceable redistribution rights. Generated prose, paraphrases, "inspired by" vocabulary and unverified text are not valid corpus material.

## Active v3 corpus

Current v3 story encoding uses 64 complete sentences, 16 from each of four copyright-expired works distributed by Aozora Bunko. The exact sentence bank and per-sentence source IDs live in [`src/jp/authentic.ts`](../src/jp/authentic.ts).

| Source ID | Work | Author | Aozora source |
| --- | --- | --- | --- |
| `aozora-yume-juya` | 夢十夜 | 夏目 漱石 | https://www.aozora.gr.jp/cards/000148/card799.html |
| `aozora-yodaka-no-hoshi` | よだかの星 | 宮沢 賢治 | https://www.aozora.gr.jp/cards/000081/card473.html |
| `aozora-chumon-no-ooi-ryoriten` | 注文の多い料理店 | 宮沢 賢治 | https://www.aozora.gr.jp/cards/000081/card43754.html |
| `aozora-rashomon` | 羅生門 | 芥川 龍之介 | https://www.aozora.gr.jp/cards/000879/card127.html |

Aozora Bunko's handling guidance for copyright-expired works permits copying, redistribution and modification of those files. The active bank removes Aozora ruby/control annotations where necessary but does not generate, paraphrase or rewrite the prose itself.

Aozora guidance: https://www.aozora.gr.jp/guide/kijyunn.html

## Encoding rule

The 64 authentic sentences form a fixed radix-64 alphabet. One complete source sentence represents one digit. New story payloads therefore concatenate published sentences directly; they do not manufacture new sentences from nouns, verbs, character archetypes or grammar templates.

The transport header and chapter separator are protocol framing rather than corpus material. Payload chapters remain bounded to 256 framed bytes and round-trip exactly.

## Legacy synthetic tables

`src/jp/packs/original-ln-*.xml` are historical synthetic tables from earlier releases. They are retained only because deleting or changing them would make existing v1/v2 story embeds undecodable. `src/jp/default.ts` exposes them under explicit `V1`/`V2` compatibility names, and the current encoder does not use either table.

The former `original-ln-silent-witch-v1.xml` pack is also decoder-only. It was generated rather than sourced from the actual work and must never be treated as *Secrets of the Silent Witch* corpus material.

## Adding sources

Every future active entry must satisfy all of these conditions:

1. The wording comes from a real identifiable published source.
2. The repository has a lawful right to redistribute that wording, for example because the work is public domain or carries a compatible licence.
3. Provenance is recorded alongside the sentence, including work, author and source URL.
4. Normalisation is mechanical only, such as removing ruby/control markup. Do not paraphrase or invent replacement prose.
5. Tests must fail if an active sentence lacks provenance or if the fixed active sentence alphabet becomes ambiguous.

A work being free to read on the web is not by itself permission to copy it into this repository. In particular, the freely readable *Silent Witch* web novel is not bundled unless a redistribution licence or permission covering the text is established. If that permission is obtained later, its authentic sentences can be added as a new versioned corpus with explicit provenance.