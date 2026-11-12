export type GameState =
  | 'TITLE'
  | 'PREPARE'
  | 'MOVING'
  | 'ARRIVING'
  | 'JUDGING'
  | 'EVENT_RESULT'
  | 'GAMEOVER'
  | 'CLEAR';

export type VisitorCategory =
  | 'NORMAL'           // 通常の住人・正規職員
  | 'RUDE_RESIDENT'    // マナーの悪い住人（車内要求あり）
  | 'RULE_VIOLATOR'    // 張り紙のルールと矛盾する偽住人・幽霊・不審者
  | 'ANOMALY';         // あからさまな怪異

export type CabinActionType = 'FAN' | 'CLOSE' | 'BELL';

export interface CabinRequest {
  id: string;
  requiredAction: CabinActionType;
  actionLabel: string;       // UIバッジ用の短い表示（例：「換気扇」「閉ボタン」）
  promptText: string;        // 同乗中に要求する自然なセリフ
  successText: string;       // 対処成功時のセリフ
  failureReason: string;     // 未対処時のクレームトースト理由
}

export interface VisitorAppearance {
  silhouetteType: 'SLENDER' | 'HUNCHED' | 'BROAD' | 'TALL_DISTORTED' | 'SUIT';
  clothingColor: string;     // Hex color
  clothingLabel: string;     // 内部識別用ラベル
  eyeStyle: 'NORMAL' | 'DEAD_DARK' | 'GLOWING_RED' | 'HOLLOW' | 'MULTIPLE';
  mouthStyle: 'NEUTRAL' | 'SMILE' | 'SMIRK' | 'JAGGED_GRIN' | 'OPEN_VOID';
  glitchLevel: 'NONE' | 'SUBTLE' | 'HEAVY';
  headTiltDeg?: number;
  hasCap?: boolean;          // 警備員の制帽・配達員の帽子
  hasNameTag?: boolean;      // 名札の有無
  hasPackage?: boolean;      // 配達物・カバン
  hasUmbrella?: boolean;
  hasWeapon?: boolean;       // 65%以上開けた時に見える凶器（血の包丁など）
  hasBloodStains?: boolean;  // 65%以上開けた時に見える衣服の血痕
  isShadowedFace?: boolean;  // 65%未満では濃い影が落ちて不気味に見える演出
}

export interface PeekTransformation {
  type: 'REVEAL_THREAT' | 'REVEAL_INNOCENT';
  thresholdPercent: number;  // 変化が発生する扉の開放率（例: 65）
  revealedDialogue: string;  // 65%を超えた瞬間に変化するセリフ
  revealedAppearance: Partial<VisitorAppearance>;
}

export interface VisitorData {
  id: string;
  name: string;
  category: VisitorCategory;
  isThreat: boolean;         // true = 乗せてはいけない, false = 乗せるべき正規人物
  dialogue: string;          // 扉が隙間まで開いた時のセリフ
  enteredDialogue: string;   // 100%開けて乗せた時のセリフ
  rejectedDialogue: string;  // 閉め出した時のセリフ・反応
  appearance: VisitorAppearance;
  /**
   * 扉を60%〜70%（65%）まで開けて覗き込んだ際に発生する段階的変化
   */
  peekTransformation?: PeekTransformation;
  /**
   * 一見普通の住人として乗車し、下降中に車内で本性を現しやすい潜伏フラグ
   */
  isCabinSleeper?: boolean;
  /**
   * 出現階層チャプター（1: 14-11F, 2: 9-6F, 3: 4-2F）または特定階
   */
  chapter?: 1 | 2 | 3;
  spawnFloors?: number[];
  /**
   * 扉をこじ開けようとする怪異の場合、閉めるのに必要なCLOSEボタン押下回数
   */
  requiredCloseClicks: number;
  /**
   * 怪異・偽物を乗せてしまった場合の精神力（SAN値）ダメージ
   */
  sanityDamage: number;
  /**
   * 住人を乗せた後、次のMOVINGフェーズで発生する車内リクエスト
   */
  cabinRequest?: CabinRequest;
  description: string;
}

export interface NoticeRule {
  id: string;
  shortTitle: string;        // 左パネルのボタンに表示する短いタイトル（縦割れ防止）
  title: string;             // モーダル拡大時の正式タイトル
  subtitle: string;
  content: string;
  highlightWarning: string;
  unlockedAtFloor: 15 | 10 | 5;
  stampText?: string;
  isCorrupted?: boolean;     // 5Fの赤黒い怪文書演出用
}

export interface ActivePassenger {
  visitor: VisitorData;
  boardedFloor: number;
  remainingFloors: number;   // 1〜2階分下降すると自動降車
  pendingRequest?: CabinRequest;
  requestFulfilled: boolean;
}

export type MovingEventType = 'MIASMA' | 'MIRROR_GHOST' | 'PASSENGER_REQUEST';

export interface MovingCabinEvent {
  id: string;
  type: MovingEventType;
  requiredAction: CabinActionType; // 'FAN' | 'BELL' | 'CLOSE'
  timeLeftMs: number;
  maxTimeMs: number;
  status: 'ACTIVE' | 'RESOLVED' | 'FAILED';
  promptText: string;
  targetPassengerId?: string;
}

export interface ToastAlert {
  id: string;
  type: 'COMPLAINT' | 'DANGER' | 'INFO';
  title: string;
  message: string;
}

export interface EventOutcome {
  type: 'SAFE_BOARDED' | 'SAFE_REJECTED_THREAT' | 'MISTAKE_BOARDED_THREAT' | 'MISTAKE_REJECTED_RESIDENT';
  title: string;
  detail: string;
  sanityDelta: number;
  complaintDelta: number;
}
