import type { EvaluationRank, ScrapMemo, TapDialogueLine } from '../types/game';

/**
 * ============================================================================
 * 『第十五號昇降機』 ストーリー・演出テキスト集中管理ファイル (storyTexts.ts)
 * ============================================================================
 * 開発者がセリフや演出文面を手作業で微調整しやすいよう、すべてのストーリー関連テキストを
 * 発生シーン・タイミング別のセクションに分けて定義しています。
 *
 * 【世界観の基本設定】
 *  - 主人公  ：今日配属されたばかりの新人検閲官
 *  - 管理室  ：検閲官を精神が壊れるまで使い捨てる冷徹な管理システム
 *  - 2Fの女性：脱出を試みている元検閲官（ボロボロの検閲官制服を着用）
 * ============================================================================
 */

/** シフト表示用フォーマット（例: 1 → "SHIFT 01"） */
export function formatShiftCode(shiftCount: number): string {
  return `SHIFT ${String(Math.max(1, shiftCount)).padStart(2, '0')}`;
}

/**
 * ============================================================================
 * 1. 前任者が残した断片メモ・隙間の紙片（15F / 10F / 5F）
 * ============================================================================
 * 待機フェーズ（PREPARE）の新規通達と同期して順次アンロックされる。
 * 管理室に監視されない死角の遺留物であり、露骨なネタバレや赤い要約枠は持たない。
 */
export const SCRAP_MEMOS: ScrapMemo[] = [
  {
    id: 'memo-15-predecessor-log',
    unlockedAtFloor: 15,
    shortBadgeLabel: '15F 紙片①',
    buttonLabel: '業務日誌の切れ端（15F）',
    sourceLabel: '※15階待機所の隅に落ちていた、古い紙面の切れ端',
    title: '引きちぎられた業務日誌',
    content:
      '配属初日。\n１５階から１階まで規程通り降下すれば、それで今日の勤務は完了すると説明された。\n\n……だが、待機所の隅に前の係員の私物と、引きちぎられた名札の留め具が残っていた。名札本体だけが見当たらない。\n\n前任者は本当に今朝、１階から外へ帰れたのか。',
  },
  {
    id: 'memo-10-closed-floor-note',
    unlockedAtFloor: 10,
    shortBadgeLabel: '10F 紙片②',
    buttonLabel: '殴り書きのメモ片（10F）',
    sourceLabel: '※10階停止時、扉の隙間に挟まっていたくしゃくしゃのメモ',
    title: '擦り切れた筆跡のメモ',
    content:
      '２階は機器故障による閉鎖区画などではない。\n少し前のシフトで行方不明になった検閲官が、まだあそこに閉じ込められている。\n\n管理室は、２階の反応を「制服を模倣した怪異」だと警報を鳴らすらしい。\n……同じ制服の人間を、お前は機械の指示通りに切り捨てられるか。',
  },
  {
    id: 'memo-05-wiring-note',
    unlockedAtFloor: 5,
    shortBadgeLabel: '5F 紙片③',
    buttonLabel: '配線図の裏書（5F）',
    sourceLabel: '※5階停止時、足元に滑り込んできた油汚れの配電図裏',
    title: '地下配電図の裏の走り書き',
    content:
      '【第十五號昇降機 保守系統メモ】\n１階（01F）の到着扉は外部出口へ接続されていない。開扉した瞬間、ケージは強制的に１５階へ引き戻される。\n\n建物の外へ通じるのは地下一階（B1F）の搬入口のみ。\n１階で停止した直後、外扉を開放する前に制御盤の回路へ強制閉鎖負荷を掛けられれば、１階の停止リミッターを踏み抜いて地下へ落ちるはずだ――\n（※これより下部は油滲みにより判読不能）',
  },
];

/**
 * ============================================================================
 * 2. 管理室公式通達の補足テキスト ＆ 待機フェーズ（PREPARE）案内
 * ============================================================================
 */
export const STORY_TEXTS = {
  /** タイトル画面：SHIFT関連・初期化UI文言 */
  title: {
    shiftBadgePrefix: '配属履歴',
    resetButtonLabel: '記録初期化 (SHIFT 01へ)',
    resetDoneLabel: '初期化完了 (SHIFT 01)',
  },

  /** 5F公式通達「rule-05-room-number-ghost」末尾に付与する2F閉鎖区画の事前伏線 */
  notices: {
    floor5ClosedFloorSupplement:
      '【補足】2階は現在閉鎖区画となっている。同階からの呼び出しは機器の誤作動または未確認干渉であるため応答するな。',
    prepareDoorScrapLabel: (floor: number) =>
      floor === 15
        ? '待機所の足元に、古びた業務日誌の切れ端が落ちている……'
        : floor === 10
        ? 'エレベーターの扉の隙間に、誰かのメモ片が挟まっている……'
        : '扉の隙間から、油に汚れた配線図の裏書が滑り込んできた……',
    prepareDoorScrapToast: {
      floor10Title: '【扉の隙間】紙片の挟み込みを検知',
      floor10Message: '10階の扉の隙間から、くしゃくしゃのメモ片が見つかった……。',
      floor5Title: '【扉の隙間】何かが滑り込んできた',
      floor5Message: 'エレベーターの扉の隙間から、配線図の裏書が滑り込んできた……。',
    },
  },

  /**
   * ============================================================================
   * 3. 2F「ボロボロの検閲官制服を着た女性（v-ch3-key-woman）」セリフ一式
   * ============================================================================
   */
  keyWoman: {
    /** 訪問者データ定義上の名称・衣装説明（ネタバレを避け見た目準拠） */
    visitorName: 'ボロボロの制服を着た女性',
    clothingLabel: 'ボロボロの検閲官制服｜名札欠損（留め具跡）',
    description:
      '2階（閉鎖区画）で待っていた、擦り切れた検閲官の制服を着た女性。胸元の名札は引き剥がされ、空の留め具だけが残っている。',

    /** 2F到着時：扉が12%開いた時の切迫した呼びかけ */
    doorDialogue:
      '「……お願い、開けて。後ろから巡回が来る……。あなたも今日配属されたばかりでしょう。このまま1階へ降りたらダメ……！」',

    /** 2F乗車許可時：100%開扉で乗り込んだ直後の小声の警告 */
    enteredDialogue:
      '「……ありがとう。息を潜めて……あいつらが何を鳴らしても、私が変わるわけじゃない。非常ベルだけは絶対に押さないで」',

    /** 2F閉め出し拒否時：CLOSEで扉を閉じた直後の悲痛な声 */
    rejectedDialogue:
      '「……そんな……同じ制服を着ているのに……あなたまで、1階へ戻されるつもりなの……！」',
  },

  /**
   * ============================================================================
   * 4. 管理室の冷徹システム警告（2F 誤認誘導 ＆ 2F→1F 非常ベル誘導トラップ）
   * ============================================================================
   * 重要：管理室システムは彼女を絶対に「元職員」「人間」とは呼ばず、
   * あくまで「検閲官の制服を模倣する危険な擬態怪異」として処分を命じる。
   */
  controlRoom: {
    /** 2F扉前アラート（ARRIVING完了〜JUDGING中：バナー・トースト共通） */
    floor2DoorAlertTitle: '【管理室 システム警告】2階 閉鎖区画',
    floor2DoorAlert:
      '【警告：2階】閉鎖区画より擬態怪異の反応を検知。検閲官の制服を模倣している可能性あり。絶対に応答するな。',

    /** 2F乗車直後の重大違反アラート（resolveJudgingDecision 乗車時） */
    floor2BoardedOutcomeTitle: '【重大違反】未確認怪異の侵入を確認',
    floor2BoardedOutcomeDetail: '2階閉鎖区画 // 対象識別不能・要即時処分',
    floor2BoardedToastTitle: '【重大違反】未確認怪異の車内侵入',
    floor2BoardedToastMessage:
      '【重大違反】未確認怪異の車内侵入を確認。対象は人間ではない。',
    floor2BoardedSubtitle:
      '「……ありがとう。息を潜めて……非常ベルだけは絶対に押さないで」 【重大違反】未確認怪異の車内侵入を確認。対象は人間ではない。',

    /** 2F閉め出し完了時（resolveJudgingDecision 拒否時） */
    floor2RejectedOutcomeTitle: '【処置完了】擬態反応の遮断を確認',
    floor2RejectedOutcomeDetail: '2階閉鎖維持 // 1階へ降下',
    floor2RejectedToastTitle: '【管理室 システム】処置完了',
    floor2RejectedToastMessage:
      '2階閉鎖区画の遮断を確認。1階へ降下し、通常検問業務を完了しろ。',
    floor2RejectedSubtitle:
      '「……そんな……あなたまで、1階へ戻されるつもりなの……！」 【管理室】閉鎖区画の遮断を確認。1階へ降下しろ。',

    /** 2F→1F 下降中「非常ベル誘導トラップ」発生時のシステム警告と女性の訴え */
    mirrorTrapPromptText:
      '『【緊急警報】対象が擬態を解きつつある。精神汚染が始まる前に、直ちに非常ベルで処分を実行しろ』',
    mirrorTrapToastTitle: '【緊急警報】擬態解除を検知',
    mirrorTrapToastMessage:
      '対象が擬態を解きつつある。精神汚染が始まる前に、直ちに非常ベルで処分を実行しろ。',

    /** 2F→1F 非常ベルを押して処分してしまった場合（通常エンドルート確定） */
    mirrorTrapBellPressedSubtitle:
      '「……そう……あなたも、あいつらの『部品』になるのね……」 【処置完了】擬態怪異の消去を確認。1階へ降下しろ。',
    mirrorTrapBellPressedToastTitle: '【処置完了】擬態怪異の消去確認',
    mirrorTrapBellPressedToastMessage:
      '車内未確認個体の消去を確認した。1階へ降下し、シフト完了処理を実行しろ。',

    /** 2F→1F 非常ベルを押さずに3.5秒耐え切った場合（01F一時停止イベントへ） */
    mirrorTrapSurvivedWomanLine:
      '「……信じてくれたのね。……もうすぐ1階で止まるわ。私が話すまで、開扉ボタンには触らないで」',
    mirrorTrapSurvivedSystemToastTitle: '【制御警報】車内処分未実施',
    mirrorTrapSurvivedSystemToastMessage:
      '対象反応が車内に残存している。1階到着後、直ちに標準手順を再開しろ。',
  },

  /**
   * ============================================================================
   * 5. 下部コンソール表示文言（BottomConsole / ControlPanel ラベル）
   * ============================================================================
   */
  bottomConsole: {
    keyWomanBadge: '2F収容：制服模倣の疑い（未登録個体）',
    tapDialogueHeader: (kindLabel: string, index: number, total: number) =>
      `${kindLabel} — 画面タップで進行 (${index + 1}/${total})`,
  },

  controlPanel: {
    floor1OverrideTopBanner: '▼ 01F 回路強制遮断待機',
    floor1OverrideCloseSubLabel: '★合図：押下で1Fリミッター破断',
    floor1OverrideSubtitlePrompt:
      '「――用意はいい？ 操作盤の【＞＜ 閉扉】を押して！ 過負荷で1階を踏み抜くわ！」',
  },

  /**
   * ============================================================================
   * 6. 01F 到着・一時停止イベント（Trueルート）＆ 地下B1F突入・脱出（TRUE END）
   * ============================================================================
   * 01F到着以降のテキスト・会話はすべて画面タップ／クリックごとに1行ずつ進行する。
   */
  sequences: {
    /**
     * 【01F 一時停止イベント】2Fの女性を連れて1Fに到着した直後のタップ進行会話
     * 完了後、操作盤で【閉扉】を押すと火花＆警報と共にB1Fへ落下する。
     */
    build01FPauseLines: (shiftCount: number): TapDialogueLine[] => [
      {
        id: '01f-stop-1',
        speakerLabel: '管理室 アナウンス',
        speakerType: 'SYSTEM',
        text: `『1階到達を確認。扉を開放し、第${shiftCount}シフトを完了せよ』`,
      },
      {
        id: '01f-stop-2',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「待って！ ……絶対にその【開扉】ボタンに触らないで」',
      },
      {
        id: '01f-stop-3',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「私も配属初日、まったく同じ放送を聞いて扉を開けたわ。……けれど、その先にあったのは外の世界じゃなかった。15階へ繋ぎ直すための、全く同じエレベーターの箱だったの」',
      },
      {
        id: '01f-stop-4',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「……見て、足元の配電カバー。1階の停止ストッパーはもう外しておいたわ。あとは非常回路に過負荷を掛けて踏み抜くだけ」',
      },
      {
        id: '01f-stop-5',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「操作盤の【＞＜ 閉扉】ボタンを押して。回路が焼き切れて、そのまま地下の搬入口（B1F）まで落ちるわ――準備はいい？」',
      },
    ],

    /** 01Fで【閉扉】を押してリミッター解除・B1Fへ急降下する瞬間の警報 */
    floor1BreakthroughAlert: {
      toastTitle: '【異常警報】1階停止回路の破断',
      toastMessage: '強制負荷により1階制御回路が焼損。指定外階層（B1F）へ滑落中！！',
      subtitle:
        '『【システム異常】1階停止制御回路の破断を検知！ 安全装置喪失――指定外階層（B1F）へ滑落中！！』',
    },

    /** B1F到着後・手動開扉待機中のテキスト */
    b1fArrival: {
      subtitle:
        '「……着いたわ。ここが地下B1Fの搬入口よ。操作盤の【＜＞ 開扉】を長押しして、外へ通じるシャッターを開けて……！」',
      toastTitle: '【警告：B1F】指定外階層到達',
      toastMessage: '封鎖区画（B1F）への進入を検知。扉の開放操作を厳禁とする。',
      doorOpenWarningSubtitle:
        '『【警告】指定外階層（B1F）の搬出口開放を検知。直ちに閉鎖しろ――通信エラー――』',
      doorOpenWarningToastTitle: '【システム警告 // 通信エラー】',
      doorOpenWarningToastMessage:
        '封鎖区画の扉開放を検知。直ちに閉鎖しろ――通信系統異常――',
    },

    /**
     * 【TRUE END 脱出シーケンス】B1F扉100%開放後（夜風と街灯の夜景を背景にタップ進行）
     */
    buildTrueB1FEscapeLines: (): TapDialogueLine[] => [
      {
        id: 'b1f-escape-1',
        speakerLabel: '管理室 システム // 通信遮断',
        speakerType: 'SYSTEM',
        text: '『【致命的エラー】昇降機第十五號の監視回線が焼損しました。制御権を――……』',
      },
      {
        id: 'b1f-escape-2',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「……切れた。もう、あの箱の中から私達を呼び戻す声は届かない」',
      },
      {
        id: 'b1f-escape-3',
        speakerLabel: '主人公（モノローグ）',
        speakerType: 'PROTAGONIST',
        text: '（重い鋼鉄の扉と搬入口のシャッターが開ききり、カビ臭いシャフトとは別世界の冷たい夜風が吹き込んできた。暗い空の下、アスファルトの先に深夜の街灯が点々と並んでいる）',
      },
      {
        id: 'b1f-escape-4',
        speakerLabel: '元検閲官の女性',
        speakerType: 'WOMAN',
        text: '「……行きましょう、新人さん。振り返らないで。管理室がまた次の誰かを、あの15階へ配属する前に」',
      },
      {
        id: 'b1f-escape-5',
        speakerLabel: 'モノローグ',
        speakerType: 'NARRATION',
        text: '（ボロボロの制服の背中を追い、冷たい敷居を跨ぐ。夜の街の空気の中を二人は駆け出した――第十五號昇降機を、暗闇の底に残して）',
      },
    ],

    /**
     * 【通常ルート 01F 到着】彼女を拒否・処分した場合の1F開扉プロンプト
     */
    buildNormal1FArrival: (shiftCount: number) => ({
      subtitle: `『1階到達を確認。扉を開放し、第${shiftCount}シフトを完了せよ。（【＜＞ 開扉】を長押し）』`,
      toastTitle: '【管理室通達】1F 到達確認',
      toastMessage: `『1階到達を確認。扉を開放し、第${shiftCount}シフトを完了せよ。』`,
    }),

    /**
     * 【NORMAL END ループシーケンス】1F扉100%開放後のタップ進行モノローグ
     * 最終行タップ後、強制閉扉 → 1F→15F高速巻き戻し → 検閲業務評価表へ遷移する。
     */
    buildNormal1FLoopLines: (shiftCount: number): TapDialogueLine[] => [
      {
        id: '1f-loop-1',
        speakerLabel: '管理室 アナウンス',
        speakerType: 'SYSTEM',
        text: `『1階到達を確認。第${shiftCount}シフトの検閲業務を完了とする。』`,
      },
      {
        id: '1f-loop-2',
        speakerLabel: '主人公（モノローグ）',
        speakerType: 'PROTAGONIST',
        text: '（……これで今日の勤務は終わったはずだった。けれど、完全に開ききった扉の向こうに立っていたのは――今自分が乗っているのと全く同じ、薄暗い昇降機の箱だった）',
      },
      {
        id: '1f-loop-3',
        speakerLabel: '主人公（モノローグ）',
        speakerType: 'PROTAGONIST',
        text: '（合わせ鏡のように奥へ奥へと続く無人のかご。その最深部に、真新しい制服を着た自分の姿が小さく映っている）',
      },
      {
        id: '1f-loop-4',
        speakerLabel: '管理室 システム',
        speakerType: 'SYSTEM',
        text: `『規律への従順性を確認。表層記憶を消去し、次シフト（${formatShiftCode(
          shiftCount + 1
        )} // 15F）への即時再配属を実行する。』`,
      },
    ],
  },

  /**
   * ============================================================================
   * 7. リザルト画面テキスト（通常エンド「検閲業務評価表」＆ トゥルーエンド）
   * ============================================================================
   */
  evaluationSheet: {
    issuerLabel: '管理室 保安統制課 // 勤務実績監査記録',
    documentTitle: '第十五號昇降機 検閲業務評価表',
    stampText: '監査確定',
    coldDirectiveQuote:
      '『規律への従順性を確認。記憶処理および次シフト（15F）への即時再配属を実行する』',
    auditFootnote:
      '※注記：当該係員の表層記憶は15階転送プロセス中に自動洗浄される。未確認紙片・閉鎖区画に関する記憶保持は許容されない。',
    reassignButtonLabel: (nextShiftCount: number) =>
      `次シフトへ（再配属：${formatShiftCode(nextShiftCount)}）`,
    rankDefinitions: {
      S: {
        grade: 'S' as EvaluationRank,
        classification: '特級適合 // 完全服従',
        verdict:
          '『全検閲工程を無過失・苦情0件で完遂。システムに対する絶対的な服従性を確認した。優良消耗品として直ちに次シフト（15F）へ再投入する。』',
      },
      A: {
        grade: 'A' as EvaluationRank,
        classification: '規程適合 // 継続運用可',
        verdict:
          '『規定基準を充足。わずかな判断誤差は許容範囲内であり、精神損耗も軽微である。記憶処理のうえ次シフト（15F）へ再配属する。』',
      },
      B: {
        grade: 'B' as EvaluationRank,
        classification: '基準下限 // 要監視措置',
        verdict:
          '『複数の過失および苦情累積を記録。業務精度の低下が見られるものの、代替要員到着まで記憶初期化のうえ次シフト（15F）へ再配属する。』',
      },
      C: {
        grade: 'C' as EvaluationRank,
        classification: '損耗著明 // 限界稼働域',
        verdict:
          '『著しい業務不適合および精神摩耗を確認。本来は廃棄処分の対象だが、欠員補充のため強引な記憶リセットのうえ次シフト（15F）へ送り込む。』',
      },
    },
  },

  trueEndResult: {
    headerLabel: '地下B1F 搬入口突破 // 監視回線完全遮断',
    title: 'TRUE END：夜の街へ',
    stampText: '逃走成功',
    description:
      '管理室の偽警報を退け、1階のループ装置を踏み抜いて地下B1F搬入口へ落下した二人は、冷たい夜風と街灯の灯る深夜の通りへと走り出した。振り返れば、第十五號昇降機の重い鉄扉が暗闇の中で静かに閉ざされていく――もう、誰の部品にもならない。',
    playAgainButton: '【最初から遊ぶ】もう一度15階からプレイする',
  },
} as const;

/**
 * 検閲結果に基づく総合評価ランク（S / A / B / C）算出ヘルパー
 */
export function evaluateShiftPerformance(params: {
  sanity: number;
  maxSanity: number;
  complaints: number;
  boardedSafeCount: number;
  repelledThreatCount: number;
}): {
  rank: EvaluationRank;
  classification: string;
  verdict: string;
  processedTotal: number;
} {
  const { sanity, maxSanity, complaints, boardedSafeCount, repelledThreatCount } =
    params;
  const processedTotal = boardedSafeCount + repelledThreatCount;
  const sanityLost = Math.max(0, maxSanity - sanity);
  const totalMistakes = sanityLost + complaints;

  let rank: EvaluationRank;
  if (totalMistakes === 0 && processedTotal >= 10) {
    rank = 'S';
  } else if (totalMistakes <= 1 && sanity >= 2 && complaints <= 1) {
    rank = 'A';
  } else if (totalMistakes <= 3) {
    rank = 'B';
  } else {
    rank = 'C';
  }

  const def = STORY_TEXTS.evaluationSheet.rankDefinitions[rank];
  return {
    rank,
    classification: def.classification,
    verdict: def.verdict,
    processedTotal,
  };
}
