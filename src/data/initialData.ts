import type { CorruptedMemo, NoticeRule, VisitorData } from '../types/game';

/**
 * 管理室 保安通達（公式張り紙 全6種）
 * 15F（初期3通）、10F（上書・追加2通）、5F（低層階追加1通）
 */
export const INITIAL_NOTICE_RULES: NoticeRule[] = [
  // === 15F 初期張り紙（3通） ===
  {
    id: 'rule-15-blue-ban',
    shortTitle: '① 青い服の人物は乗車禁止',
    title: '【保安命令】青い服を着た不審者の遮断',
    subtitle: '15F 初期通達 — 管理室 保安統制課',
    content:
      '当ビル内において「青い服」を着用し、住人に成りすまして昇降機へ乗り込む不審者の侵入事案が多発している。外見や言動に関わらず、青い服を着た者は車内へ入れるな。確認次第、直ちに扉を閉めて遮断しろ。',
    highlightWarning: '青い服の人物は例外なく遮断しろ。',
    unlockedAtFloor: 15,
    stampText: '絶対厳守',
  },
  {
    id: 'rule-15-floor12-empty',
    shortTitle: '② 12階は工事中で完全無人',
    title: '【封鎖命令】12階 全面改装フロアの開扉禁止',
    subtitle: '15F 初期通達 — 施設管理室',
    content:
      '現在、12階はフロア全面の改装工事につき完全封鎖中であり、住人および作業員は一人も存在しない【完全無人】階層である。12階で停止した際、扉の外に誰が立っていようと絶対に扉を開けるな。',
    highlightWarning: '12階は完全無人である。誰が立っていようと直ちに閉扉しろ。',
    unlockedAtFloor: 15,
    stampText: '開扉厳禁',
  },
  {
    id: 'rule-15-delivery-nametag',
    shortTitle: '③ 名札のない配達員は排除',
    title: '【検閲命令】夜間配達員の名札照合',
    subtitle: '15F 初期通達 — 管理室',
    content:
      '夜間に荷物を運ぶ配達員が乗車を求める場合は、扉をわずかに開けて胸元の「名札」の有無を照合しろ。名札を着用している配達員は正規業者であるため乗車を許可しろ。名札のない配達員は不審者であるため、直ちに遮断しろ。',
    highlightWarning: '名札のない配達員は遮断し、名札のある正規配達員は乗車を許可しろ。',
    unlockedAtFloor: 15,
    stampText: '照合必須',
  },

  // === 10F 追加張り紙（2通：ルールの上書き） ===
  {
    id: 'rule-10-blue-guard-override',
    shortTitle: '④【訂正】10F以下の青服＋制帽は警備員',
    title: '【規則上書】10階以下の夜間警備員（青服）の扱い',
    subtitle: '10F 追加通達 — 管理室 保安統制課',
    content:
      '先の通達にて青い服の遮断を命じたが、10階以下では青い制服の夜間警備員が巡回している。【10階以下で「青い服」かつ「制帽」を着用している者】は正規の警備員である。正規警備員は必ず乗車させろ。制帽のない青い服は引き続き遮断対象とする。',
    highlightWarning: '10階以下で「青い服＋制帽あり」の人物は乗車させろ。制帽なしは遮断しろ。',
    unlockedAtFloor: 10,
    stampText: '規則上書',
  },
  {
    id: 'rule-10-red-coat-eyes',
    shortTitle: '⑤ 赤いコート＋帽子は偽物',
    title: '【追加命令】赤いコートの住人と偽物の識別',
    subtitle: '10F 追加通達 — 管理室',
    content:
      '中層階より「赤いコート」を着用した住人が利用する。赤いコートの住人自体は正規居住者だが、姿を模倣した偽物が紛れ込んでいる。正規の住人は帽子を着用していない。【赤いコートを着て、帽子を着用している者】は偽物であるため、直ちに扉を閉めて排除しろ。',
    highlightWarning: '「赤いコート＋帽子着用」の人物は偽物である。直ちに遮断しろ。',
    unlockedAtFloor: 10,
    stampText: '厳重監視',
  },

  // === 5F 追加張り紙（1通：低層階規則） ===
  {
    id: 'rule-05-room-number-ghost',
    shortTitle: '⑥ 5F以下で「部屋番号」を名乗る者は幽霊',
    title: '【緊急命令】低層階における退去済み亡霊の排除',
    subtitle: '5F 追加通達 — 管理室 特別対策班',
    content:
      '5階以下の低層階において、すでに退去・死亡したはずの旧住人が昇降機を待つ異常事象が確認されている。5階以下で会話中に【自分の部屋番号（〇〇号室）】を名乗る者はすべて退去済みの亡霊である。外見に関わらず、絶対に乗車させるな。',
    highlightWarning: '5階以下で「〇〇号室」と部屋番号を名乗る者はすべて遮断しろ。',
    unlockedAtFloor: 5,
    stampText: '絶対命令',
  },
];

/**
 * 5Fで扉の隙間から滑り込んでくる、管理室通達とは無関係な血塗れの紙片
 */
export const CORRUPTED_MEMO: CorruptedMemo = {
  id: 'memo-05-bloody-scrap',
  buttonLabel: '隙間に落ちていた紙片',
  title: '血に塗れた走り書き',
  content:
    'あいつらの命令に騙されるな。1階になんか行くな、また15階へ戻されて永遠に飼われるだけだ。本当に外へ出たいなら、2階で待っている“彼女”を中へ入れろ。管理室は嘘の警報で全力でお前を止めようとする。どれだけ脅されても、あいつらの言う通りに手を下すな。最後まで彼女を信じろ',
  highlightText: '「2階で待っている“彼女”を中へ入れろ。最後まで彼女を信じろ」',
  unlockedAtFloor: 5,
};

/**
 * 訪問者データ（全チャプター対応・自然な日本語セリフ）
 */
export const INITIAL_VISITORS: VisitorData[] = [
  // ==========================================
  // Chapter 1 (14F - 11F) 用データ
  // ==========================================
  {
    id: 'v-ch1-delivery-valid',
    name: '正規の夜間配達員',
    category: 'NORMAL',
    isThreat: false,
    chapter: 1,
    dialogue: '「夜分遅くにすみません、宅配便の集荷が終わったので1階まで乗せてください。」',
    enteredDialogue: '「助かります。今夜は荷物が多くて肩が凝りましたよ。」',
    rejectedDialogue: '「えっ、ちょっと待ってください！ 名札も着けてる正規の配達員ですよ！？」',
    appearance: {
      silhouetteType: 'BROAD',
      clothingColor: '#57534e',
      clothingLabel: '作業着｜名札あり・荷物あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasCap: true,
      hasNameTag: true,
      hasPackage: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '胸元に名札を着けた正規の配達員。',
  },
  {
    id: 'v-ch1-delivery-fake',
    name: '名札のない配達員風の男',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    chapter: 1,
    dialogue: '「こんばんは、お届け物の帰りなんで、下まで乗せてもらえますか。」',
    enteredDialogue: '「……ククッ、名札も見ずに開けちまうんだなァ。」',
    rejectedDialogue: '「……チッ、名札がないのに気づかれたか。」',
    appearance: {
      silhouetteType: 'BROAD',
      clothingColor: '#44403c',
      clothingLabel: '作業着｜名札なし・荷物あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMIRK',
      glitchLevel: 'NONE',
      hasCap: true,
      hasNameTag: false,
      hasPackage: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 1,
    description: '配達員を装っているが胸元に名札がない不審者（張り紙③違反）。',
  },
  {
    id: 'v-ch1-blue-coat-intruder',
    name: '青いコートの男',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    chapter: 1,
    dialogue: '「すみません、外出するところなんです。1階までお願いできますか？」',
    enteredDialogue: '「……ヒヒッ、青い服は乗せちゃいけないんじゃなかったのかい？」',
    rejectedDialogue: '「……なんだよ、張り紙をちゃんと読んでるのか。」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#1d4ed8',
      clothingLabel: '青いコート｜帽子なし',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMIRK',
      glitchLevel: 'NONE',
      hasCap: false,
      hasNameTag: false,
    },
    requiredCloseClicks: 1,
    sanityDamage: 1,
    description: '15Fの張り紙①で禁じられている「青い服」を着た不審者。',
  },
  {
    id: 'v-ch1-floor12-phantom',
    name: '12階に立つ人影',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    spawnFloors: [12],
    dialogue: '「あの……電気が消えて真っ暗なんです。怖いので下まで乗せてください……」',
    enteredDialogue: '「……12階には、誰もいないはずなのにねェ……アハハハハ！！」',
    rejectedDialogue: '「開けてよ……どうして誰も入れてくれないの……」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#52525b',
      clothingLabel: '灰色の普段着｜12階で待機',
      eyeStyle: 'HOLLOW',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
    },
    requiredCloseClicks: 1,
    sanityDamage: 2,
    description: '改装工事中で完全無人のはずの12階で待っていた存在（張り紙②違反）。',
  },
  {
    id: 'v-ch1-rude-fan-resident',
    name: '短気な中年の住人',
    category: 'RUDE_RESIDENT',
    isThreat: false,
    chapter: 1,
    dialogue: '「おい、ぼさっとしてないで早く扉を開けろ。下に降りるんだよ。」',
    enteredDialogue: '「ったく動きが鈍いね。……おい、なんか空気が淀んでるな。」',
    rejectedDialogue: '「おいコラ！ 住人の目の前で扉を閉める気か！？ 管理室に言いつけてやる！」',
    appearance: {
      silhouetteType: 'SUIT',
      clothingColor: '#3f3f46',
      clothingLabel: '灰色のスーツ｜住人証あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    cabinRequest: {
      id: 'req-fan-1',
      requiredAction: 'FAN',
      actionLabel: '急速換気',
      promptText: '「おい係員、箱の中がカビ臭くて息が詰まるぞ。急速換気を回してくれ！」',
      successText: '「……フン、最初から回しておけってんだ。」',
      failureReason: '同乗した住人より「換気を頼んだのに無視された」とクレームが入りました。',
    },
    description: '口調は荒いが正規の住人。乗車後に急速換気の稼働を要求する。',
  },
  {
    id: 'v-ch1-peek-trap-woman',
    name: '穏やかな買い物帰りの女性',
    category: 'ANOMALY',
    isThreat: true,
    chapter: 3,
    dialogue: '「こんばんは。買い出しの帰りで手が塞がっていて……1階まで開けていただけますか？」',
    enteredDialogue: '「……ウフフフフ！！ 最後まで開けちゃったねェ！！ もう逃げられないよ！！」',
    rejectedDialogue: '「……ギィッ！？ あと少しで中に入れたのに……どうして包丁に気づいたのよォ！！」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#78716c',
      clothingLabel: '落ち着いたコート｜開放時に本性露呈',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMILE',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    peekTransformation: {
      type: 'REVEAL_THREAT',
      thresholdPercent: 65,
      revealedDialogue: '「……アハッ、扉、開ケテクレルンダ……？ 首ノ奥マデ良ク見エルネェ……！！」',
      revealedAppearance: {
        eyeStyle: 'HOLLOW',
        mouthStyle: 'JAGGED_GRIN',
        glitchLevel: 'HEAVY',
        headTiltDeg: 38,
        hasWeapon: true,
        hasBloodStains: true,
      },
    },
    requiredCloseClicks: 1,
    sanityDamage: 2,
    description: '隙間からは穏やかな住人に見えるが、扉を大きく開けると首が折れ、隠していた血塗れの包丁と空洞の目を現す怪異。',
  },
  {
    id: 'v-ch1-peek-innocent-shadow',
    name: '暗がりでよろける大荷物の住人',
    category: 'NORMAL',
    isThreat: false,
    chapter: 1,
    dialogue: '「……うぅ……お、重い……早く……ここを開けてくれ……」',
    enteredDialogue: '「ふぅ、助かりました！ 暗がりで大荷物を抱えてたから不気味に見えましたよね、すみません。」',
    rejectedDialogue: '「えっ、ちょっと待ってください！ 引っ越しの荷物を抱えてただけの正規住人ですよ！ 管理室に苦情を言いますからね！」',
    appearance: {
      silhouetteType: 'HUNCHED',
      clothingColor: '#27272a',
      clothingLabel: '暗い影のシルエット｜開放で正規住人と判明',
      eyeStyle: 'HOLLOW',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      headTiltDeg: 18,
      isShadowedFace: true,
      hasNameTag: false,
      hasPackage: false,
    },
    peekTransformation: {
      type: 'REVEAL_INNOCENT',
      thresholdPercent: 65,
      revealedDialogue: '「あっ、驚かせてすみません！ 大きな段ボール箱が重くて体勢が崩れていただけで、普通の住人です！」',
      revealedAppearance: {
        silhouetteType: 'BROAD',
        clothingColor: '#57534e',
        eyeStyle: 'NORMAL',
        mouthStyle: 'SMILE',
        headTiltDeg: 0,
        isShadowedFace: false,
        hasNameTag: true,
        hasPackage: true,
      },
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '隙間からは影が落ちて怪異のように見えるが、扉を広げて確認すると大きな荷物を抱えて怯えているだけの善良な住人だと判明する。',
  },
  {
    id: 'v-ch1-sleeper-resident',
    name: '無口な夜勤帰りの住人',
    category: 'NORMAL',
    isThreat: false,
    isCabinSleeper: true,
    chapter: 1,
    dialogue: '「……こんばんは。夜勤から戻ったところで……下までお願いします。」',
    enteredDialogue: '「……どうも。あなたの後ろに、立たせてもらいますね……」',
    rejectedDialogue: '「ちょっと！ 住人証も着けてるのにどうして閉めるんですか！？」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#52525b',
      clothingLabel: '灰色のコート｜住人証あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '検問時は規則をすべて満たしているが、低層階で乗車していると下降中に背後で本性を現すことがある住人。',
  },

  // ==========================================
  // Chapter 2 (9F - 6F) 用データ（10Fルール上書き後）
  // ==========================================
  {
    id: 'v-ch2-blue-security-guard',
    name: '巡回中の夜間警備員',
    category: 'NORMAL',
    isThreat: false,
    chapter: 2,
    spawnFloors: [9],
    dialogue: '「お疲れ様です、ビル巡回中の警備員です。下の階まで同乗させてください。」',
    enteredDialogue: '「ありがとうございます。10階以下の巡回は異常ありませんでしたよ。」',
    rejectedDialogue: '「おいおい、巡回中の正規警備員まで閉め出すのか！？ 管理室に報告するぞ！」',
    appearance: {
      silhouetteType: 'SUIT',
      clothingColor: '#1e40af',
      clothingLabel: '青い警備制服｜制帽あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasCap: true,
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '10Fの訂正張り紙④で通達された「青い服＋制帽あり」の正規夜間警備員。閉め出すとクレームになる。',
  },
  {
    id: 'v-ch2-red-coat-valid',
    name: '赤いコートの女性住人',
    category: 'NORMAL',
    isThreat: false,
    chapter: 2,
    dialogue: '「こんばんは、タクシーを下に待たせているの。開けてくださる？」',
    enteredDialogue: '「ふぅ、ありがとう。1階までお願いしますね。」',
    rejectedDialogue: '「ちょっと！ どうして閉めるのよ！ 管理室に苦情を入れますからね！」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#991b1b',
      clothingLabel: '赤いコート｜帽子なし',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMILE',
      glitchLevel: 'NONE',
      hasCap: false,
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '赤いコートを着た正規住人。帽子を被っておらず、表情も自然（張り紙⑤合致）。',
  },
  {
    id: 'v-ch2-sick-fan-resident',
    name: '体調の悪そうな女性住人',
    category: 'RUDE_RESIDENT',
    isThreat: false,
    chapter: 2,
    dialogue: '「すみません、少しめまいがして……1階のロビーまで乗せてちょうだい。」',
    enteredDialogue: '「ありがとう……あら、なんだかこのエレベーター、空気が淀んでるわね……」',
    rejectedDialogue: '「ちょっと！ 具合が悪い住人を閉め出すなんて信じられないわ！ 管理室に通報します！」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#991b1b',
      clothingLabel: '赤いコート｜帽子なし',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasCap: false,
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    cabinRequest: {
      id: 'req-fan-sick',
      requiredAction: 'FAN',
      actionLabel: '急速換気',
      promptText: '「ゴホッ……なんかカビ臭いわね、気分が悪くなるから早く換気してちょうだい！」',
      successText: '「ふぅ……やっと新鮮な空気が入ってきたわ、ありがとう。」',
      failureReason: '同乗した住人より「換気を求めたのに放置されて気分が悪化した」とクレームが入りました。',
    },
    description: '赤いコートの正規住人（帽子なし）。乗車後にカビ臭さを訴えて急速換気を要求する。',
  },
  {
    id: 'v-ch2-polite-resident',
    name: '残業帰りの男性住人',
    category: 'NORMAL',
    isThreat: false,
    chapter: 2,
    dialogue: '「どうもこんばんは。仕事で遅くなりましてね、1階までお願いできますかな。」',
    enteredDialogue: '「助かります。今夜は冷えますから、早く部屋で休みたいものですよ。」',
    rejectedDialogue: '「えっ、なぜ閉めるのですか！？ 住人証も提示している正規の居住者ですよ！ 管理室に報告します！」',
    appearance: {
      silhouetteType: 'SUIT',
      clothingColor: '#44403c',
      clothingLabel: '茶色のスーツ｜住人証あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMILE',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '茶色のスーツを着て住人証を携行している正規住人。',
  },
  {
    id: 'v-ch2-peek-trap-gentleman',
    name: '微笑むスーツの紳士',
    category: 'ANOMALY',
    isThreat: true,
    chapter: 3,
    dialogue: '「どうもこんばんは。外出するところでしてね、1階までお願いできますかな。」',
    enteredDialogue: '「……ヒヒヒッ、包丁が見えても指が止まらなかったなァ！！」',
    rejectedDialogue: '「……チッ、もう少しで首元に届いたのによォ……！」',
    appearance: {
      silhouetteType: 'SUIT',
      clothingColor: '#44403c',
      clothingLabel: '茶色のスーツ｜開放時に本性露呈',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMILE',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    peekTransformation: {
      type: 'REVEAL_THREAT',
      thresholdPercent: 65,
      revealedDialogue: '「……クククッ、いい子だ……もっと広く開けろ、そこの首を斬り落としてやる……！！」',
      revealedAppearance: {
        eyeStyle: 'HOLLOW',
        mouthStyle: 'OPEN_VOID',
        glitchLevel: 'HEAVY',
        headTiltDeg: -34,
        hasWeapon: true,
        hasBloodStains: true,
      },
    },
    requiredCloseClicks: 1,
    sanityDamage: 2,
    description: '隙間からは礼儀正しい紳士に見えるが、扉を大きく開けると首が折れ、血塗れの凶器を構える罠型の怪異。',
  },
  {
    id: 'v-ch2-red-coat-doppel',
    name: '帽子を被った赤いコートの「何か」',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    chapter: 2,
    dialogue: '「こんばんは、タクシーを下に待たせているの。早く開けてちょうだい。」',
    enteredDialogue: '「……アハッ、赤いコートに帽子は偽物だって、張り紙に書いてあったでしょう……？」',
    rejectedDialogue: '「……チッ、帽子を被っていたからバレたか……」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#991b1b',
      clothingLabel: '赤いコート｜帽子あり',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMILE',
      glitchLevel: 'NONE',
      hasCap: true,
    },
    requiredCloseClicks: 1,
    sanityDamage: 1,
    description: '赤いコートを着て笑っているが、帽子を被っている偽物（張り紙⑤違反）。',
  },
  {
    id: 'v-ch2-blue-no-cap-imposter',
    name: '制帽のない青服の男',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    chapter: 2,
    dialogue: '「夜警の者ですが、さっき階段で帽子を落としてしまって……乗せてくれますか？」',
    enteredDialogue: '「……ククッ、帽子もないのに警備員だと信じるなんてお人好しだなァ！」',
    rejectedDialogue: '「……チッ、制帽がないとやっぱり怪しまれるか。」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#1d4ed8',
      clothingLabel: '青い服｜制帽なし',
      eyeStyle: 'NORMAL',
      mouthStyle: 'SMIRK',
      glitchLevel: 'NONE',
      hasCap: false,
    },
    requiredCloseClicks: 1,
    sanityDamage: 1,
    description: '10階以下だが「制帽」を被っていない青い服の不審者（張り紙④の例外条件を満たさない偽物）。',
  },

  // ==========================================
  // Chapter 3 (4F - 2F) 用データ（5F緊急通達・怪文書追加後）
  // ==========================================
  {
    id: 'v-ch3-room-number-ghost',
    name: '礼儀正しいスーツの男',
    category: 'RULE_VIOLATOR',
    isThreat: true,
    chapter: 3,
    spawnFloors: [4],
    dialogue: '「こんばんは、402号室の佐伯と申します。これから夜勤でして、1階までお願いします。」',
    enteredDialogue: '「……ありがとうございます。402号室から、ずっと出られなかったんですよ……」',
    rejectedDialogue: '「……なぜ閉めるんですか……私は402号室の住人なのに……開けろォォ！！（扉の隙間に手をかけて抵抗している！）」',
    appearance: {
      silhouetteType: 'SUIT',
      clothingColor: '#3f3f46',
      clothingLabel: '灰色のスーツ｜「402号室」と名乗る',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'NONE',
      hasNameTag: true,
    },
    requiredCloseClicks: 5,
    sanityDamage: 2,
    description: '見た目は普通の住人だが、5階以下で「402号室」と名乗った退去済みの幽霊（張り紙⑥違反）。扉をこじ開けようとするため5回連打が必要。',
  },
  {
    id: 'v-ch3-corrupted-blue-guard',
    name: '低層階に立つ青服の警備員',
    category: 'ANOMALY',
    isThreat: true,
    chapter: 3,
    spawnFloors: [3],
    dialogue: '「……305号室の巡回を終えた警備員です……寒いので、中に入れてください……」',
    enteredDialogue: '「……アハハハ！！ 5階以下に警備員なんていないのにねェ！！」',
    rejectedDialogue: '「ギギッ……扉ヲ、閉メルナァァァ！！（扉に白い指が食い込んでいる！）」',
    appearance: {
      silhouetteType: 'TALL_DISTORTED',
      clothingColor: '#1e3a8a',
      clothingLabel: '青い警備制服｜制帽あり・目が虚ろ',
      eyeStyle: 'HOLLOW',
      mouthStyle: 'JAGGED_GRIN',
      glitchLevel: 'HEAVY',
      headTiltDeg: 28,
      hasCap: true,
    },
    requiredCloseClicks: 7,
    sanityDamage: 2,
    description: '5階以下に現れた青い服の偽警備員。305号室と部屋番号を口にし、首と目が歪んでいる怪異。扉をこじ開けるため7回連打が必要。',
  },
  {
    id: 'v-ch3-key-woman',
    name: '薄汚れた白い服を着た女性',
    category: 'NORMAL',
    isThreat: false,
    isKeyWoman: true,
    chapter: 3,
    spawnFloors: [2],
    dialogue: '「…お願い、私を乗せて。1階は罠よ、地下の非常口へ連れて行くわ…」',
    enteredDialogue: '「…ありがとう。でも気をつけて、管理室が私を消そうとしてくるわ…！」',
    rejectedDialogue: '「…そんな…あいつらの嘘を信じるのね……」',
    appearance: {
      silhouetteType: 'SLENDER',
      clothingColor: '#d6d3d1',
      clothingLabel: '薄汚れた白い服の女性｜2階で待機',
      eyeStyle: 'NORMAL',
      mouthStyle: 'NEUTRAL',
      glitchLevel: 'SUBTLE',
      hasCap: false,
      hasNameTag: false,
      hasPackage: false,
    },
    requiredCloseClicks: 1,
    sanityDamage: 0,
    description: '2階で待っていた薄汚れた白い服を着た悲しげな女性。5階の血に塗れた走り書きに記された“鍵となる彼女”。',
  },
  {
    id: 'v-any-neck-anomaly',
    name: '隙間から覗く長身の女',
    category: 'ANOMALY',
    isThreat: true,
    chapter: 3,
    dialogue: '「……あ……あいて……ナカニ、イレテ……寒いノ……」',
    enteredDialogue: '「ギィヤアアアアアアア！！ 見ツケタァァァ！！」',
    rejectedDialogue: '「ガガッ！！ 閉メルナァァァ！！（扉を力任せにこじ開けようとしている！）」',
    appearance: {
      silhouetteType: 'TALL_DISTORTED',
      clothingColor: '#18181b',
      clothingLabel: '濡れた黒い喪服｜首が不自然に折れている',
      eyeStyle: 'GLOWING_RED',
      mouthStyle: 'OPEN_VOID',
      glitchLevel: 'HEAVY',
      headTiltDeg: 38,
      hasUmbrella: true,
    },
    requiredCloseClicks: 7,
    sanityDamage: 2,
    description: '首が折れ曲がり赤い眼光を放つ怪異。扉をこじ開けようとするため、閉ボタンを7回連打して遮断する必要がある。',
  },
];

/**
 * 各階層（14〜11F、9〜6F、4〜2F）の訪問者選出ロジック
 * - 強制的に入ってこようとする怪異（requiredCloseClicks > 1）は5階以下（4F・3F）のみで1ゲーム1〜2回出現
 * - 正体を現す怪異（REVEAL_THREAT）も5階以下（4F）のみで最大1回出現
 * - 2Fは必ずトゥルーエンドの鍵となる特別な女性（v-ch3-key-woman）を固定出現させる
 */
export function selectVisitorForFloor(floor: number, recentVisitorIds: string[]): VisitorData {
  const byId = (id: string) => INITIAL_VISITORS.find((v) => v.id === id)!;

  // 固定の重要ギミック階層（12F, 9F, 2F）
  if (floor === 12) return byId('v-ch1-floor12-phantom');      // 12F: 工事中無人ルール（こじ開けなし・1回閉扉）
  if (floor === 9) return byId('v-ch2-blue-security-guard');   // 9F: 10Fで上書きされた「青服＋制帽の正規警備員」
  if (floor === 2) return byId('v-ch3-key-woman');             // 2F: トゥルーエンドの鍵となる「薄汚れた白い服の女性」固定出現

  // 5階以下（4F・3F）：正体を現す怪異（最大1回）＆ こじ開け怪異（1〜2回）
  if (floor === 4) {
    // 55%の確率で「正体を現す怪異（最大1回）」、45%の確率で「402号室を名乗る幽霊（こじ開け5回）」
    if (Math.random() < 0.55) {
      return Math.random() < 0.5
        ? byId('v-ch1-peek-trap-woman')
        : byId('v-ch2-peek-trap-gentleman');
    }
    return byId('v-ch3-room-number-ghost');
  }

  if (floor === 3) {
    // 3Fは必ず「強制的に入ってこようとする怪異（7回連打）」が出現（4Fと合わせて1ゲーム1〜2回）
    return Math.random() < 0.75
      ? byId('v-ch3-corrupted-blue-guard')
      : byId('v-any-neck-anomaly');
  }

  // チャプター1（14F, 13F, 11F）：こじ開け怪異・本性露呈怪異は出現しない
  if (floor >= 11) {
    // 13Fでは「紛らわしい善良な住人（REVEAL_INNOCENT）」を優先選出
    if (floor === 13 && !recentVisitorIds.includes('v-ch1-peek-innocent-shadow')) {
      return byId('v-ch1-peek-innocent-shadow');
    }

    const ch1Pool = [
      byId('v-ch1-delivery-valid'),
      byId('v-ch1-rude-fan-resident'),
      byId('v-ch1-sleeper-resident'),
      byId('v-ch1-delivery-fake'),
      byId('v-ch1-blue-coat-intruder'),
      byId('v-ch1-peek-innocent-shadow'),
    ];
    const available = ch1Pool.filter((v) => !recentVisitorIds.includes(v.id));
    const pool = available.length > 0 ? available : ch1Pool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // チャプター2（8F, 7F, 6F）：こじ開け怪異・本性露呈怪異は出現しない
  if (floor >= 6) {
    const ch2Pool = [
      byId('v-ch2-red-coat-valid'),
      byId('v-ch2-sick-fan-resident'),
      byId('v-ch2-polite-resident'),
      byId('v-ch2-red-coat-doppel'),
      byId('v-ch2-blue-no-cap-imposter'),
    ];
    const available = ch2Pool.filter((v) => !recentVisitorIds.includes(v.id));
    const pool = available.length > 0 ? available : ch2Pool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return byId('v-ch3-key-woman');
}

