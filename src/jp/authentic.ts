export interface AuthenticJapaneseSource {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly card: string;
  readonly status: "public-domain";
}

export interface AuthenticJapaneseSentence {
  readonly source: AuthenticJapaneseSource["id"];
  readonly text: string;
}

/**
 * Active story-encoding sources.
 *
 * Every sentence below is copied from the named Aozora Bunko public-domain
 * work. Aozora ruby/control annotations are removed, but the prose itself is
 * not generated, paraphrased, expanded, or recombined.
 *
 * Do not add "inspired by" or generated prose to this table. New entries need
 * a traceable redistributable source and must preserve the source wording.
 */
export const authenticJapaneseSources = [
  {
    id: "aozora-yume-juya",
    title: "夢十夜",
    author: "夏目 漱石",
    card: "https://www.aozora.gr.jp/cards/000148/card799.html",
    status: "public-domain",
  },
  {
    id: "aozora-yodaka-no-hoshi",
    title: "よだかの星",
    author: "宮沢 賢治",
    card: "https://www.aozora.gr.jp/cards/000081/card473.html",
    status: "public-domain",
  },
  {
    id: "aozora-chumon-no-ooi-ryoriten",
    title: "注文の多い料理店",
    author: "宮沢 賢治",
    card: "https://www.aozora.gr.jp/cards/000081/card43754.html",
    status: "public-domain",
  },
  {
    id: "aozora-rashomon",
    title: "羅生門",
    author: "芥川 龍之介",
    card: "https://www.aozora.gr.jp/cards/000879/card127.html",
    status: "public-domain",
  },
] as const satisfies readonly AuthenticJapaneseSource[];

export const authenticJapaneseSentences = [
  { source: "aozora-yume-juya", text: "こんな夢を見た。" },
  { source: "aozora-yume-juya", text: "とうてい死にそうには見えない。" },
  { source: "aozora-yume-juya", text: "自分も確にこれは死ぬなと思った。" },
  { source: "aozora-yume-juya", text: "自分は黙って、顔を枕から離した。" },
  { source: "aozora-yume-juya", text: "腕組をしながら、どうしても死ぬのかなと思った。" },
  { source: "aozora-yume-juya", text: "しばらくして、女がまたこう云った。" },
  { source: "aozora-yume-juya", text: "自分は、いつ逢いに来るかねと聞いた。" },
  { source: "aozora-yume-juya", text: "自分は黙って首肯いた。" },
  { source: "aozora-yume-juya", text: "自分はただ待っていると答えた。" },
  { source: "aozora-yume-juya", text: "――もう死んでいた。" },
  { source: "aozora-yume-juya", text: "自分はそれから庭へ下りて、真珠貝で穴を掘った。" },
  { source: "aozora-yume-juya", text: "星の破片は丸かった。" },
  { source: "aozora-yume-juya", text: "自分は苔の上に坐った。" },
  { source: "aozora-yume-juya", text: "大きな赤い日であった。" },
  { source: "aozora-yume-juya", text: "そうして黙って沈んでしまった。" },
  { source: "aozora-yume-juya", text: "二つとまた勘定した。" },

  { source: "aozora-yodaka-no-hoshi", text: "よだかは、実にみにくい鳥です。" },
  { source: "aozora-yodaka-no-hoshi", text: "足は、まるでよぼよぼで、一間とも歩けません。" },
  { source: "aozora-yodaka-no-hoshi", text: "こんな調子です。" },
  { source: "aozora-yodaka-no-hoshi", text: "ある夕方、とうとう、鷹がよだかのうちへやって参りました。" },
  { source: "aozora-yodaka-no-hoshi", text: "よだかは、じっと目をつぶって考えました。" },
  { source: "aozora-yodaka-no-hoshi", text: "あたりは、もううすくらくなっていました。" },
  { source: "aozora-yodaka-no-hoshi", text: "夜だかは巣から飛び出しました。" },
  { source: "aozora-yodaka-no-hoshi", text: "雲が意地悪く光って、低くたれています。" },
  { source: "aozora-yodaka-no-hoshi", text: "山焼けの火は、だんだん水のように流れてひろがり、雲も赤く燃えているようです。" },
  { source: "aozora-yodaka-no-hoshi", text: "よだかはまっすぐに、弟の川せみの所へ飛んで行きました。" },
  { source: "aozora-yodaka-no-hoshi", text: "きれいな川せみも、丁度起きて遠くの山火事を見ていた所でした。" },
  { source: "aozora-yodaka-no-hoshi", text: "よだかは泣きながら自分のお家へ帰って参りました。" },
  { source: "aozora-yodaka-no-hoshi", text: "みじかい夏の夜はもうあけかかっていました。" },
  { source: "aozora-yodaka-no-hoshi", text: "霧がはれて、お日さまが丁度東からのぼりました。" },
  { source: "aozora-yodaka-no-hoshi", text: "行っても行っても、お日さまは近くなりませんでした。" },
  { source: "aozora-yodaka-no-hoshi", text: "夜だかはおじぎを一つしたと思いましたが、急にぐらぐらしてとうとう野原の草の上に落ちてしまいました。" },

  { source: "aozora-chumon-no-ooi-ryoriten", text: "それはだいぶの山奥でした。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "はじめの紳士は、すこし顔いろを悪くして、じっと、もひとりの紳士の、顔つきを見ながら云いました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "ところがどうも困ったことは、どっちへ行けば戻れるのか、いっこうに見当がつかなくなっていました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "風がどうと吹いてきて、草はざわざわ、木の葉はかさかさ、木はごとんごとんと鳴りました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人の紳士は、ざわざわ鳴るすすきの中で、こんなことを云いました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "その時ふとうしろを見ますと、立派な一軒の西洋造りの家がありました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人は玄関に立ちました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "玄関は白い瀬戸の煉瓦で組んで、実に立派なもんです。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "そして硝子の開き戸がたって、そこに金文字でこう書いてありました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人はそこで、ひどくよろこんで言いました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人は戸を押して、なかへ入りました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "そこはすぐ廊下になっていました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人は大歓迎というので、もう大よろこびです。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "ずんずん廊下を進んで行きますと、こんどは水いろのペンキ塗りの扉がありました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "そして二人はその扉をあけようとしますと、上に黄いろな字でこう書いてありました。" },
  { source: "aozora-chumon-no-ooi-ryoriten", text: "二人は云いながら、その扉をあけました。" },

  { source: "aozora-rashomon", text: "ある日の暮方の事である。" },
  { source: "aozora-rashomon", text: "一人の下人が、羅生門の下で雨やみを待っていた。" },
  { source: "aozora-rashomon", text: "広い門の下には、この男のほかに誰もいない。" },
  { source: "aozora-rashomon", text: "そこで洛中のさびれ方は一通りではない。" },
  { source: "aozora-rashomon", text: "洛中がその始末であるから、羅生門の修理などは、元より誰も捨てて顧る者がなかった。" },
  { source: "aozora-rashomon", text: "その代りまた鴉がどこからか、たくさん集って来た。" },
  { source: "aozora-rashomon", text: "作者はさっき、「下人が雨やみを待っていた」と書いた。" },
  { source: "aozora-rashomon", text: "しかし、下人は雨がやんでも、格別どうしようと云う当てはない。" },
  { source: "aozora-rashomon", text: "雨は、羅生門をつつんで、遠くから、ざあっと云う音をあつめて来る。" },
  { source: "aozora-rashomon", text: "下人は、大きな嚔をして、それから、大儀そうに立上った。" },
  { source: "aozora-rashomon", text: "夕冷えのする京都は、もう火桶が欲しいほどの寒さである。" },
  { source: "aozora-rashomon", text: "風は門の柱と柱との間を、夕闇と共に遠慮なく、吹きぬける。" },
  { source: "aozora-rashomon", text: "それから、何分かの後である。" },
  { source: "aozora-rashomon", text: "下人は、守宮のように足音をぬすんで、やっと急な梯子を、一番上の段まで這うようにして上りつめた。" },
  { source: "aozora-rashomon", text: "下人は、それらの死骸の腐爛した臭気に思わず、鼻を掩った。" },
  { source: "aozora-rashomon", text: "下人の眼は、その時、はじめてその死骸の中に蹲っている人間を見た。" },
] as const satisfies readonly AuthenticJapaneseSentence[];
