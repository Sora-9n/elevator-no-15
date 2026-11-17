import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ActivePassenger,
  EndingType,
  EventOutcome,
  GameState,
  MovingCabinEvent,
  NoticeRule,
  ScrapMemo,
  TapDialogueLine,
  TapSequenceKind,
  ToastAlert,
  VisitorData,
} from './types/game';
import {
  INITIAL_NOTICE_RULES,
  selectVisitorForFloor,
} from './data/initialData';
import {
  SCRAP_MEMOS,
  STORY_TEXTS,
  evaluateShiftPerformance,
  formatShiftCode,
} from './data/storyTexts';
import { soundManager } from './utils/SoundManager';
import { FloorIndicator } from './components/FloorIndicator';
import { ElevatorDoor } from './components/ElevatorDoor';
import { NoticeBoard, MobileDocButtons } from './components/NoticeBoard';
import { NoticeModals, type InspectModalState } from './components/NoticeModals';
import { ControlPanel } from './components/ControlPanel';
import { BottomConsole } from './components/BottomConsole';
import {
  AlertOctagon,
  RotateCcw,
  ShieldCheck,
  Play,
  Pause,
  Skull,
  MessageSquareWarning,
  Bell,
  Wind,
} from 'lucide-react';

const MAX_SANITY = 3;
const MAX_COMPLAINTS = 3;
const QUIET_MOVING_DURATION_MS = 3800; // 階と階の間の通常移動時間を少し長めに設定（3.8秒）
const EVENT_MOVING_WINDOW_MS = 5200; // 下降中イベント発生時の対処猶予を長めに確保（5.2秒）
const KEY_WOMAN_MIRROR_WINDOW_MS = 3500; // 2F→1F「鍵となる彼女」第2の試練カウントダウン（3.5秒）
const ARRIVING_FLASH_MS = 950; // 到着音が鳴った後、扉が閉まったまま階数が浮かび上がる時間
const ARRIVING_DURATION_MS = 1850; // 到着演出全体の時間（階数表示950ms ＋ 扉が12%まで開く900ms）
const JUDGING_DURATION_MS = 8000; // 8.0秒ベース
const RESULT_DURATION_MS = 2200;
const RAPID_FAN_DURATION_MS = 3000; // 急速換気稼働時間（3.0秒）
const SHIFT_COUNT_STORAGE_KEY = 'elevator15_shift_count';

function loadShiftCount(): number {
  try {
    const raw = window.localStorage.getItem(SHIFT_COUNT_STORAGE_KEY);
    if (!raw) return 1;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  } catch {
    return 1;
  }
}

function saveShiftCount(shiftCount: number): void {
  try {
    window.localStorage.setItem(
      SHIFT_COUNT_STORAGE_KEY,
      String(Math.max(1, shiftCount))
    );
  } catch {
    // ストレージ不可環境ではメモリ状態のみで継続
  }
}

// 約1.8秒（1800ms / 50ms = 36ティック）で 12% → 100%（+88%）に到達する増分
const OPEN_HOLD_STEP_PER_50MS = 88 / 36;
// 最終フロア（1F / B1F）で重々しい扉を 0% → 100% まで約3.75秒（75ティック）かけてじわじわ開ける増分
const FINAL_DOOR_OPEN_STEP_PER_50MS = 100 / 75;
// こじ開け怪異が放置された際、約6.0秒（6000ms / 50ms = 120ティック）で 12% → 100%（+88%）まで強制開扉する増分
const PRYING_OPEN_STEP_PER_50MS = 88 / 120;

export function App() {
  // コアゲーム状態
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [shiftCount, setShiftCount] = useState<number>(() => loadShiftCount());
  const [shiftResetFeedback, setShiftResetFeedback] = useState<boolean>(false);
  const [floor, setFloor] = useState<number>(15);
  const [sanity, setSanity] = useState<number>(MAX_SANITY);
  const [complaints, setComplaints] = useState<number>(0);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [endingType, setEndingType] = useState<EndingType>('NORMAL');
  const [endingOverlayFade, setEndingOverlayFade] = useState<'NONE' | 'BLACKOUT' | 'WHITEOUT'>('NONE');

  // 01F一時停止＆タップ進行ストーリー状態
  const [tapSequence, setTapSequence] = useState<{
    kind: TapSequenceKind;
    lines: TapDialogueLine[];
    index: number;
  } | null>(null);
  const [isAwaiting1FOverride, setIsAwaiting1FOverride] = useState<boolean>(false);
  const [isPlungingToB1F, setIsPlungingToB1F] = useState<boolean>(false);

  // 扉＆訪問者状態
  const [doorOpenPercent, setDoorOpenPercent] = useState<number>(0);
  const [isHoldingOpen, setIsHoldingOpen] = useState<boolean>(false);
  const [currentVisitor, setCurrentVisitor] = useState<VisitorData | null>(null);
  const [closeClicksRemaining, setCloseClicksRemaining] = useState<number>(1);
  const [judgingTimeLeftMs, setJudgingTimeLeftMs] = useState<number>(JUDGING_DURATION_MS);
  const [isPeekTransformed, setIsPeekTransformed] = useState<boolean>(false);
  const [isArrivingFlash, setIsArrivingFlash] = useState<boolean>(false);
  const [isKeyWomanAlertActive, setIsKeyWomanAlertActive] = useState<boolean>(false);

  // 張り紙既読管理 ＆ モーダル開放（0.25xスローモーション）状態
  const [readRuleIds, setReadRuleIds] = useState<string[]>([]);
  const [inspectModalState, setInspectModalState] = useState<InspectModalState>(null);
  const isInspectingModalOpen = inspectModalState !== null;

  // 同乗住人・車内設備・下降中イベント・トースト通知
  const [activePassengers, setActivePassengers] = useState<ActivePassenger[]>([]);
  const [boardedSafeCount, setBoardedSafeCount] = useState<number>(0);
  const [repelledThreatCount, setRepelledThreatCount] = useState<number>(0);
  const [isFanOn, setIsFanOn] = useState<boolean>(false);
  const [movingEvent, setMovingEvent] = useState<MovingCabinEvent | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>(
    '『第十五號昇降機の夜間検問業務を開始しろ。規程違反者を1人でも通した場合、即刻業務停止処分とする。』'
  );
  const [eventOutcome, setEventOutcome] = useState<EventOutcome | null>(null);
  const [toastAlert, setToastAlert] = useState<ToastAlert | null>(null);

  // 演出トリガー用（画面シェイク・赤フラッシュ）
  const [screenShake, setScreenShake] = useState<'NONE' | 'SUBTLE' | 'VIOLENT'>('NONE');
  const [jumpscareFlash, setJumpscareFlash] = useState<boolean>(false);

  // 参照用Ref
  const recentVisitorIdsRef = useRef<string[]>([]);
  const isHoldingOpenRef = useRef<boolean>(false);
  const doorPercentRef = useRef<number>(0);
  const decisionLockedRef = useRef<boolean>(false);
  const isPeekTransformedRef = useRef<boolean>(false);
  const peekFreezeTicksRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const activePassengersRef = useRef<ActivePassenger[]>([]);
  const movingEventRef = useRef<MovingCabinEvent | null>(null);
  const floorsSinceLastMovingEventRef = useRef<number>(1);
  const mirrorGhostTriggeredCountRef = useRef<number>(0);
  const miasmaTriggeredCountRef = useRef<number>(0);
  const fanTimerRef = useRef<number | null>(null);
  const sanityRef = useRef<number>(MAX_SANITY);
  const complaintsRef = useRef<number>(0);
  const isModalOpenRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const scrapToastTimerRef = useRef<number | null>(null);
  const b1fTransitionTimerRef = useRef<number | null>(null);
  const arrivingFlashTimeoutRef = useRef<number | null>(null);
  const endingRewindTimerRef = useRef<number | null>(null);
  const endingSeqTimer1Ref = useRef<number | null>(null);
  const endingSeqTimer2Ref = useRef<number | null>(null);
  const endingLatchTimerRef = useRef<number | null>(null);
  const trueEndUnlockedRef = useRef<boolean>(false);
  const b1fOpenWarningTriggeredRef = useRef<boolean>(false);
  const floorRef = useRef<number>(15);
  const gameStateRef = useRef<GameState>('TITLE');
  const shiftCountRef = useRef<number>(shiftCount);
  const tapSequenceRef = useRef<{
    kind: TapSequenceKind;
    lines: TapDialogueLine[];
    index: number;
  } | null>(null);
  const isAwaiting1FOverrideRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const currentVisitorRef = useRef<VisitorData | null>(null);
  const closeClicksRemainingRef = useRef<number>(1);
  const isFanOnRef = useRef<boolean>(false);
  const readRuleIdsRef = useRef<string[]>([]);

  useEffect(() => {
    readRuleIdsRef.current = readRuleIds;
  }, [readRuleIds]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    shiftCountRef.current = shiftCount;
  }, [shiftCount]);

  useEffect(() => {
    tapSequenceRef.current = tapSequence;
  }, [tapSequence]);

  useEffect(() => {
    isAwaiting1FOverrideRef.current = isAwaiting1FOverride;
  }, [isAwaiting1FOverride]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    currentVisitorRef.current = currentVisitor;
  }, [currentVisitor]);

  useEffect(() => {
    closeClicksRemainingRef.current = closeClicksRemaining;
  }, [closeClicksRemaining]);

  useEffect(() => {
    isFanOnRef.current = isFanOn;
  }, [isFanOn]);

  useEffect(() => {
    floorRef.current = floor;
  }, [floor]);

  useEffect(() => {
    activePassengersRef.current = activePassengers;
  }, [activePassengers]);

  useEffect(() => {
    movingEventRef.current = movingEvent;
  }, [movingEvent]);

  useEffect(() => {
    sanityRef.current = sanity;
  }, [sanity]);

  useEffect(() => {
    complaintsRef.current = complaints;
  }, [complaints]);

  useEffect(() => {
    isModalOpenRef.current = isInspectingModalOpen;
  }, [isInspectingModalOpen]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // TITLE / GAMEOVER / CLEAR 画面では機械環境音・ループ音を完全に停止し、2F警報を確実に消去する
  useEffect(() => {
    if (gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR') {
      setIsKeyWomanAlertActive(false);
      setInspectModalState(null);
      setIsPlungingToB1F(false);
      soundManager.stopCabinRattle();
      soundManager.stopMotorDrone();
      soundManager.stopDoorMotor();
      soundManager.stopRapidVentilation();
      soundManager.stopMiasmaHeartbeat();
      soundManager.stopAnomalyPresence();
      soundManager.stopPryingLoop();
      if (gameState === 'TITLE' || gameState === 'GAMEOVER') {
        soundManager.stopMorningAmbience();
        soundManager.stopNightEscapeAmbience();
        tapSequenceRef.current = null;
        setTapSequence(null);
        isAwaiting1FOverrideRef.current = false;
        setIsAwaiting1FOverride(false);
      }
    }
  }, [gameState]);

  // アンマウント時に残存タイマーをすべて安全に解放する
  useEffect(() => {
    return () => {
      if (fanTimerRef.current) window.clearInterval(fanTimerRef.current);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      if (scrapToastTimerRef.current) window.clearTimeout(scrapToastTimerRef.current);
      if (b1fTransitionTimerRef.current) window.clearTimeout(b1fTransitionTimerRef.current);
      if (arrivingFlashTimeoutRef.current) window.clearTimeout(arrivingFlashTimeoutRef.current);
      if (endingRewindTimerRef.current) window.clearInterval(endingRewindTimerRef.current);
      if (endingSeqTimer1Ref.current) window.clearTimeout(endingSeqTimer1Ref.current);
      if (endingSeqTimer2Ref.current) window.clearTimeout(endingSeqTimer2Ref.current);
      if (endingLatchTimerRef.current) window.clearTimeout(endingLatchTimerRef.current);
    };
  }, []);

  // 画面上部のトースト通知（デフォルト3.2秒表示）
  const showToast = useCallback(
    (type: ToastAlert['type'], title: string, message: string, durationMs = 3200) => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      setToastAlert({
        id: `${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
      });
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastAlert(null);
      }, durationMs);
    },
    []
  );

  // ミュート切替
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    const gs = gameStateRef.current;
    soundManager.setMuted(
      nextMuted,
      gs !== 'TITLE' && gs !== 'GAMEOVER' && gs !== 'CLEAR'
    );
  }, []);

  // 一時停止（ポーズ）切替
  const handleTogglePause = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs === 'TITLE' || gs === 'GAMEOVER' || gs === 'CLEAR') return;
    const nextPaused = !isPausedRef.current;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
    if (nextPaused) {
      soundManager.pauseAudio();
    } else {
      soundManager.resumeAudio();
    }
  }, []);

  // 張り紙・紙片を既読にする（PREPARE中に全公式通達を確認完了した場合は案内字幕も更新）
  const handleMarkRuleRead = useCallback((id: string) => {
    setReadRuleIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      readRuleIdsRef.current = next;
      if (gameStateRef.current === 'PREPARE') {
        const currentFloor = floorRef.current;
        const currentUnlocked = INITIAL_NOTICE_RULES.filter(
          (r) => currentFloor <= r.unlockedAtFloor
        );
        const remainingUnread = currentUnlocked.filter(
          (r) => !next.includes(r.id)
        ).length;
        if (remainingUnread === 0) {
          setActiveSubtitle(
            `『【${currentFloor}F 通達確認完了】すべての通達を確認した。操作盤の「▼ 検問開始（応答）」を押して${currentFloor}階の検問を開始しろ。』`
          );
        }
      }
      return next;
    });
  }, []);

  // モーダル開放ハンドラ群（PC・スマホ共通）
  const handleOpenRule = useCallback(
    (rule: NoticeRule) => {
      handleMarkRuleRead(rule.id);
      setInspectModalState({ type: 'RULE', rule });
    },
    [handleMarkRuleRead]
  );

  const handleOpenRuleList = useCallback(() => {
    setInspectModalState({ type: 'RULE_LIST' });
  }, []);

  const handleOpenManual = useCallback(() => {
    setInspectModalState({ type: 'MANUAL' });
  }, []);

  const handleOpenMemo = useCallback(
    (memo: ScrapMemo) => {
      handleMarkRuleRead(memo.id);
      setInspectModalState({ type: 'MEMO', memo });
    },
    [handleMarkRuleRead]
  );

  const handleOpenMemoList = useCallback(() => {
    setInspectModalState({ type: 'MEMO_LIST' });
  }, []);

  const handleCloseModal = useCallback(() => {
    setInspectModalState(null);
  }, []);

  // ゲーム開始・リトライ初期化（15FのPREPAREフェーズから開始・全フラグ完全リセット）
  const startGame = useCallback(() => {
    if (fanTimerRef.current) {
      window.clearInterval(fanTimerRef.current);
      fanTimerRef.current = null;
    }
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (scrapToastTimerRef.current) {
      window.clearTimeout(scrapToastTimerRef.current);
      scrapToastTimerRef.current = null;
    }
    if (b1fTransitionTimerRef.current) {
      window.clearTimeout(b1fTransitionTimerRef.current);
      b1fTransitionTimerRef.current = null;
    }
    if (arrivingFlashTimeoutRef.current) {
      window.clearTimeout(arrivingFlashTimeoutRef.current);
      arrivingFlashTimeoutRef.current = null;
    }
    if (endingRewindTimerRef.current) {
      window.clearInterval(endingRewindTimerRef.current);
      endingRewindTimerRef.current = null;
    }
    if (endingSeqTimer1Ref.current) {
      window.clearTimeout(endingSeqTimer1Ref.current);
      endingSeqTimer1Ref.current = null;
    }
    if (endingSeqTimer2Ref.current) {
      window.clearTimeout(endingSeqTimer2Ref.current);
      endingSeqTimer2Ref.current = null;
    }
    if (endingLatchTimerRef.current) {
      window.clearTimeout(endingLatchTimerRef.current);
      endingLatchTimerRef.current = null;
    }
    window.scrollTo(0, 0);
    soundManager.init();
    soundManager.playButtonClick('SWITCH');
    soundManager.stopDoorMotor();
    soundManager.stopMotorDrone();
    soundManager.stopRapidVentilation();
    soundManager.stopMiasmaHeartbeat();
    soundManager.stopAnomalyPresence();
    soundManager.stopPryingLoop();
    soundManager.stopMorningAmbience();
    soundManager.stopNightEscapeAmbience();
    soundManager.startCabinRattle();

    recentVisitorIdsRef.current = [];
    decisionLockedRef.current = false;
    isHoldingOpenRef.current = false;
    doorPercentRef.current = 0;
    isPeekTransformedRef.current = false;
    peekFreezeTicksRef.current = 0;
    movingEventRef.current = null;
    floorsSinceLastMovingEventRef.current = 1;
    mirrorGhostTriggeredCountRef.current = 0;
    miasmaTriggeredCountRef.current = 0;
    trueEndUnlockedRef.current = false;
    b1fOpenWarningTriggeredRef.current = false;
    tapSequenceRef.current = null;
    isAwaiting1FOverrideRef.current = false;
    isPausedRef.current = false;
    currentVisitorRef.current = null;
    closeClicksRemainingRef.current = 1;
    isFanOnRef.current = false;
    readRuleIdsRef.current = [];
    setIsPaused(false);
    setTapSequence(null);
    setIsAwaiting1FOverride(false);
    setIsPlungingToB1F(false);

    floorRef.current = 15;
    setFloor(15);
    setSanity(MAX_SANITY);
    setComplaints(0);
    setGameOverReason('');
    setEndingType('NORMAL');
    setEndingOverlayFade('NONE');
    setDoorOpenPercent(0);
    setIsHoldingOpen(false);
    setCurrentVisitor(null);
    setIsPeekTransformed(false);
    setIsArrivingFlash(false);
    setIsKeyWomanAlertActive(false);
    setActivePassengers([]);
    setBoardedSafeCount(0);
    setRepelledThreatCount(0);
    setIsFanOn(false);
    setMovingEvent(null);
    setEventOutcome(null);
    setJumpscareFlash(false);
    setScreenShake('NONE');
    setReadRuleIds([]);
    setInspectModalState(null);
    setToastAlert(null);

    setActiveSubtitle(
      `『【15F 待機所 // ${formatShiftCode(
        shiftCountRef.current
      )}】保安通達（3通）をすべて確認しろ。確認完了後、「▼ 検問開始（応答）」を押して15階の検問を開始しろ。』`
    );
    gameStateRef.current = 'PREPARE';
    setGameState('PREPARE');
  }, []);

  // 次シフトへ再配属（SHIFT COUNT +1 を永続化して 15F から再開）
  const handleReassignNextShift = useCallback(() => {
    const nextShift = shiftCountRef.current + 1;
    saveShiftCount(nextShift);
    shiftCountRef.current = nextShift;
    setShiftCount(nextShift);
    startGame();
  }, [startGame]);

  // タイトル画面用：勤務履歴（SHIFT COUNT）の初期化
  const handleResetShiftData = useCallback(() => {
    soundManager.playButtonClick('SWITCH');
    saveShiftCount(1);
    shiftCountRef.current = 1;
    setShiftCount(1);
    setShiftResetFeedback(true);
    window.setTimeout(() => setShiftResetFeedback(false), 2200);
  }, []);

  // 01F到着以降の全ストーリー会話・モノローグを1タップ（または1クリック）ごとに1行ずつ送る進行ハンドラ
  const advanceTapSequence = useCallback(() => {
    if (isPausedRef.current || isModalOpenRef.current) return;
    const current = tapSequenceRef.current;
    if (!current) return;

    soundManager.playButtonClick('SWITCH');
    const nextIndex = current.index + 1;

    if (nextIndex < current.lines.length) {
      const nextLine = current.lines[nextIndex];
      const updated = { ...current, index: nextIndex };
      tapSequenceRef.current = updated;
      setTapSequence(updated);
      setActiveSubtitle(nextLine.text);
      if (current.kind === 'TRUE_B1F_ESCAPE' && nextLine.id === 'b1f-escape-1') {
        soundManager.playComplaintBuzzer();
      }
      return;
    }

    // 最終行をタップ完了した後の遷移処理
    tapSequenceRef.current = null;
    setTapSequence(null);

    if (current.kind === 'TRUE_1F_STOP') {
      // 01F一時停止イベント完了 → 操作盤の「＞＜ 閉扉」押下を待機する状態へ
      decisionLockedRef.current = false;
      isAwaiting1FOverrideRef.current = true;
      setIsAwaiting1FOverride(true);
      setActiveSubtitle(STORY_TEXTS.controlPanel.floor1OverrideSubtitlePrompt);
      return;
    }

    if (current.kind === 'TRUE_B1F_ESCAPE') {
      // B1F 夜の街脱出セリフ完了 → 静かな暗転の後に TRUE END リザルトへ
      setEndingOverlayFade('BLACKOUT');
      if (endingSeqTimer2Ref.current) {
        window.clearTimeout(endingSeqTimer2Ref.current);
      }
      endingSeqTimer2Ref.current = window.setTimeout(() => {
        endingSeqTimer2Ref.current = null;
        setEndingOverlayFade('NONE');
        setGameState('CLEAR');
      }, 950);
      return;
    }

    if (current.kind === 'NORMAL_1F_LOOP') {
      // 通常エンド：強制閉扉 ＋ 1F→15F高速巻き戻し → 検閲業務評価表（SHIFT N）へ
      soundManager.playDoorSlide(0.35, false);
      doorPercentRef.current = 0;
      setDoorOpenPercent(0);
      if (endingLatchTimerRef.current) {
        window.clearTimeout(endingLatchTimerRef.current);
      }
      endingLatchTimerRef.current = window.setTimeout(() => {
        soundManager.playDoorLatchShut();
      }, 240);
      soundManager.startMotorDrone();
      setScreenShake('VIOLENT');

      let rewindFloor = 1;
      if (endingRewindTimerRef.current) {
        window.clearInterval(endingRewindTimerRef.current);
      }
      endingRewindTimerRef.current = window.setInterval(() => {
        rewindFloor += 1;
        floorRef.current = rewindFloor;
        setFloor(rewindFloor);
        soundManager.playFloorRewindTick(rewindFloor);

        if (rewindFloor >= 15) {
          if (endingRewindTimerRef.current) {
            window.clearInterval(endingRewindTimerRef.current);
            endingRewindTimerRef.current = null;
          }
          setEndingOverlayFade('BLACKOUT');
          if (endingSeqTimer2Ref.current) {
            window.clearTimeout(endingSeqTimer2Ref.current);
          }
          endingSeqTimer2Ref.current = window.setTimeout(() => {
            endingSeqTimer2Ref.current = null;
            soundManager.stopMotorDrone();
            setScreenShake('NONE');
            setEndingOverlayFade('NONE');
            setGameState('CLEAR');
          }, 950);
        }
      }, 115);
    }
  }, []);

  // Enter / Space キーでもタップ進行を可能にする
  useEffect(() => {
    if (!tapSequence) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advanceTapSequence();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tapSequence, advanceTapSequence]);

  // PREPARE（15F・10F・5F）での通達確認完了後、その階での検問フェーズ（ARRIVING → JUDGING）を開始する
  const handleStartDescent = useCallback(() => {
    if (gameStateRef.current !== 'PREPARE') return;
    const currentFloor = floorRef.current;
    const currentUnlocked = INITIAL_NOTICE_RULES.filter(
      (r) => currentFloor <= r.unlockedAtFloor
    );
    const hasUnread = currentUnlocked.some(
      (r) => !readRuleIdsRef.current.includes(r.id)
    );
    if (hasUnread) return;

    if (scrapToastTimerRef.current) {
      window.clearTimeout(scrapToastTimerRef.current);
      scrapToastTimerRef.current = null;
    }
    soundManager.playButtonClick('SWITCH');

    const nextVisitor = selectVisitorForFloor(
      currentFloor,
      recentVisitorIdsRef.current
    );
    recentVisitorIdsRef.current = [...recentVisitorIdsRef.current, nextVisitor.id];
    currentVisitorRef.current = nextVisitor;
    setCurrentVisitor(nextVisitor);
    closeClicksRemainingRef.current = nextVisitor.requiredCloseClicks;
    setCloseClicksRemaining(nextVisitor.requiredCloseClicks);
    setIsPeekTransformed(false);
    isPeekTransformedRef.current = false;
    peekFreezeTicksRef.current = 0;
    setEventOutcome(null);
    gameStateRef.current = 'ARRIVING';
    setGameState('ARRIVING');
  }, []);

  // JUDGING中の決定処理（乗車許可 / 閉め出し拒否 / 時間切れ強制乗車）
  const resolveJudgingDecision = useCallback(
    (decision: 'BOARD' | 'REJECT' | 'TIMEOUT_BOARD') => {
      const visitor = currentVisitorRef.current;
      if (decisionLockedRef.current || !visitor) return;
      decisionLockedRef.current = true;
      isHoldingOpenRef.current = false;
      setIsHoldingOpen(false);
      // 検問決定の瞬間、2F用の特級危険物警報フラグを即座に消去する
      setIsKeyWomanAlertActive(false);

      soundManager.stopDoorMotor();
      soundManager.stopPryingLoop();
      soundManager.stopAnomalyPresence();

      const currentFloor = floorRef.current;
      let nextSanity = sanityRef.current;
      let nextComplaints = complaintsRef.current;
      let outcome: EventOutcome;

      // ★ 2階（2F）固定クライマックスイベント：「元検閲官の女性」の特別分岐（管理室は擬態怪異として冷徹に排除を命じる）
      if (visitor.isKeyWoman) {
        if (decision === 'BOARD' || decision === 'TIMEOUT_BOARD') {
          // 警告を無視して100%まで開けて招き入れた場合：ダメージ・クレームなしで第2の試練（非常ベルトラップ）へ進む
          doorPercentRef.current = 100;
          setDoorOpenPercent(100);
          soundManager.playDoorSlide(0.4, true);
          soundManager.playDoorBumperStop();
          soundManager.playComplaintBuzzer();
          setScreenShake('VIOLENT');

          setBoardedSafeCount((prev) => prev + 1);
          const newPassenger: ActivePassenger = {
            visitor,
            boardedFloor: currentFloor,
            remainingFloors: 99,
            requestFulfilled: true,
          };
          setActivePassengers((prev) => {
            const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
            return [...trimmed, newPassenger];
          });

          outcome = {
            type: 'SAFE_BOARDED',
            title: STORY_TEXTS.controlRoom.floor2BoardedOutcomeTitle,
            detail: STORY_TEXTS.controlRoom.floor2BoardedOutcomeDetail,
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(STORY_TEXTS.controlRoom.floor2BoardedSubtitle);
          showToast(
            'DANGER',
            STORY_TEXTS.controlRoom.floor2BoardedToastTitle,
            STORY_TEXTS.controlRoom.floor2BoardedToastMessage,
            3600
          );
        } else {
          // 「閉（CLOSE）」で閉め出した場合：クレームなしで1F（通常エンドルート）へ進む
          doorPercentRef.current = 0;
          setDoorOpenPercent(0);
          soundManager.playDoorSlide(0.35, false);
          window.setTimeout(() => soundManager.playDoorLatchShut(), 280);
          trueEndUnlockedRef.current = false;
          setEndingType('NORMAL');

          outcome = {
            type: 'SAFE_REJECTED_THREAT',
            title: STORY_TEXTS.controlRoom.floor2RejectedOutcomeTitle,
            detail: STORY_TEXTS.controlRoom.floor2RejectedOutcomeDetail,
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(STORY_TEXTS.controlRoom.floor2RejectedSubtitle);
          showToast(
            'INFO',
            STORY_TEXTS.controlRoom.floor2RejectedToastTitle,
            STORY_TEXTS.controlRoom.floor2RejectedToastMessage,
            3500
          );
        }

        setEventOutcome(outcome);
        setGameState('EVENT_RESULT');
        return;
      }

      if (decision === 'BOARD' || decision === 'TIMEOUT_BOARD') {
        doorPercentRef.current = 100;
        setDoorOpenPercent(100);
        soundManager.playDoorSlide(0.4, true);
        soundManager.playDoorBumperStop();

        if (visitor.isThreat) {
          // 怪異またはルール違反の偽物を乗せてしまった
          soundManager.playJumpscareNoise();
          setJumpscareFlash(true);
          setScreenShake('VIOLENT');
          nextSanity = Math.max(0, nextSanity - visitor.sanityDamage);
          setSanity(nextSanity);

          const timeoutPrefix =
            decision === 'TIMEOUT_BOARD' ? '【時間超過】強制開扉／' : '';
          outcome = {
            type: 'MISTAKE_BOARDED_THREAT',
            title: '【重大失態】危険個体の侵入を許した',
            detail: `${timeoutPrefix}精神力 -${visitor.sanityDamage}`,
            sanityDelta: -visitor.sanityDamage,
            complaintDelta: 0,
          };
          setActiveSubtitle(visitor.enteredDialogue);
          showToast(
            'DANGER',
            '【管理室警告】規程違反個体の侵入',
            `『規程違反個体の侵入を許した。業務監査記録に重大過失として記載する。』（精神力 -${visitor.sanityDamage}）`
          );
        } else {
          // 正規の住人・職員を乗せた（1〜2階で自動降車、車内は最大2名まで）
          setBoardedSafeCount((prev) => prev + 1);
          const stayFloors =
            visitor.cabinRequest || visitor.isCabinSleeper
              ? 2
              : Math.random() < 0.55
              ? 1
              : 2;

          const newPassenger: ActivePassenger = {
            visitor,
            boardedFloor: currentFloor,
            remainingFloors: stayFloors,
            pendingRequest: visitor.cabinRequest,
            requestFulfilled: !visitor.cabinRequest,
          };

          setActivePassengers((prev) => {
            const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
            return [...trimmed, newPassenger];
          });

          outcome = {
            type: 'SAFE_BOARDED',
            title: '【検閲通過】乗客収容完了',
            detail: `${currentFloor}Fより収容（残${stayFloors}階で退出）`,
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(visitor.enteredDialogue);
        }
      } else {
        // REJECT: 扉を0%まで閉め切った
        doorPercentRef.current = 0;
        setDoorOpenPercent(0);
        soundManager.playDoorSlide(0.35, false);
        window.setTimeout(() => soundManager.playDoorLatchShut(), 280);

        if (visitor.isThreat) {
          // 怪異・偽物を正しく閉め出した
          setRepelledThreatCount((prev) => prev + 1);
          outcome = {
            type: 'SAFE_REJECTED_THREAT',
            title: '【排除完了】不適格対象を遮断',
            detail: `${currentFloor}F 通過完了`,
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(visitor.rejectedDialogue);
        } else {
          // 正規の住人・警備員を誤って閉め出した → クレーム +1 ＆ 上部トースト表示
          soundManager.playComplaintBuzzer();
          setScreenShake('SUBTLE');
          nextComplaints = Math.min(MAX_COMPLAINTS, nextComplaints + 1);
          setComplaints(nextComplaints);

          outcome = {
            type: 'MISTAKE_REJECTED_RESIDENT',
            title: '【管理室警告】正規住人を閉め出した',
            detail: `苦情累積 ${nextComplaints}/${MAX_COMPLAINTS}`,
            sanityDelta: 0,
            complaintDelta: 1,
          };
          setActiveSubtitle(visitor.rejectedDialogue);
          showToast(
            'COMPLAINT',
            `【管理室警告】不当閉鎖 (${nextComplaints}/${MAX_COMPLAINTS})`,
            '『正規住人の不当な閉鎖を確認した。監視カメラで全て記録している。以後注意しろ。』'
          );
        }
      }

      setEventOutcome(outcome);
      setGameState('EVENT_RESULT');
    },
    [showToast]
  );

  // 下降完了後に次の階へ到着させる共通遷移処理（同乗者の自動降車・1F一時停止イベント・通常1F分岐を含む）
  const completeDescentToNextFloor = useCallback(
    (currentFloor: number) => {
      soundManager.stopMotorDrone();
      soundManager.stopMiasmaHeartbeat();
      soundManager.stopAnomalyPresence();
      movingEventRef.current = null;
      setMovingEvent(null);
      setJumpscareFlash(false);
      setIsKeyWomanAlertActive(false);

      // 精神力0またはクレーム上限3ならゲームオーバー
      if (sanityRef.current <= 0) {
        soundManager.playJumpscareNoise();
        setGameOverReason(
          '下降中の車内異変に対処できず、作業員の精神崩壊を確認した。これ以上の運行継続は不可能と判断し、昇降機を強制停止した。'
        );
        setGameState('GAMEOVER');
        return;
      }
      if (complaintsRef.current >= MAX_COMPLAINTS) {
        soundManager.playJumpscareNoise();
        setGameOverReason(
          '乗客からの苦情累積が3件に達したため、管理室規程に基づき昇降機を強制停止・運行資格剥奪とした。'
        );
        setGameState('GAMEOVER');
        return;
      }

      const nextFloor = currentFloor - 1;

      // ★ 最終フロア（01F）到着処理（Trueルートでもまずは01Fで必ず一時停止し、女性の説明タップ進行後に閉扉でB1Fへ落下する）
      if (nextFloor <= 1) {
        currentVisitorRef.current = null;
        setCurrentVisitor(null);
        setEventOutcome(null);
        isHoldingOpenRef.current = false;
        setIsHoldingOpen(false);
        doorPercentRef.current = 0;
        setDoorOpenPercent(0);
        floorRef.current = 1;
        setFloor(1);
        isAwaiting1FOverrideRef.current = false;
        setIsAwaiting1FOverride(false);

        soundManager.playArrivalChime(false);
        setIsArrivingFlash(true);
        if (arrivingFlashTimeoutRef.current) {
          window.clearTimeout(arrivingFlashTimeoutRef.current);
        }
        arrivingFlashTimeoutRef.current = window.setTimeout(
          () => setIsArrivingFlash(false),
          ARRIVING_FLASH_MS
        );
        setScreenShake('NONE');

        if (trueEndUnlockedRef.current) {
          // ② トゥルーエンディングルート：01F一時停止イベント（全セリフをタップ進行後、操作盤【＞＜ 閉扉】でB1F突破！）
          setEndingType('TRUE');
          decisionLockedRef.current = true;
          const pauseLines = STORY_TEXTS.sequences.build01FPauseLines(
            shiftCountRef.current
          );
          const seq = {
            kind: 'TRUE_1F_STOP' as const,
            lines: pauseLines,
            index: 0,
          };
          tapSequenceRef.current = seq;
          setTapSequence(seq);
          setActiveSubtitle(pauseLines[0].text);
          setGameState('FINAL_DOOR');
          return;
        }

        // ① 通常エンディングルート：01Fに到着し、FINAL_DOOR（手動開扉フェーズ）へ移行
        setEndingType('NORMAL');
        setActivePassengers([]);
        decisionLockedRef.current = false;
        const arrivalPrompt = STORY_TEXTS.sequences.buildNormal1FArrival(
          shiftCountRef.current
        );
        setActiveSubtitle(arrivalPrompt.subtitle);
        showToast(
          'INFO',
          arrivalPrompt.toastTitle,
          arrivalPrompt.toastMessage,
          3800
        );
        setGameState('FINAL_DOOR');
        return;
      }

      floorRef.current = nextFloor;
      setFloor(nextFloor);

      // 同乗者の残り乗車階数を -1 し、0になった住人は静かに降車（ポップアップは出さない）
      const currentPassengers = activePassengersRef.current;
      let disembarkedCount = 0;
      const remainingPassengers: ActivePassenger[] = [];

      for (const p of currentPassengers) {
        const nextRemaining = p.remainingFloors - 1;
        if (nextRemaining <= 0) {
          disembarkedCount += 1;
        } else {
          remainingPassengers.push({
            ...p,
            remainingFloors: nextRemaining,
          });
        }
      }

      if (disembarkedCount > 0) {
        setActivePassengers(remainingPassengers);
      }

      // 10F・5Fは中間チェックポイント（通達確認の直後に、その場で即検問フェーズへ移行）
      if (nextFloor === 10 || nextFloor === 5) {
        soundManager.playCheckpointNotice();
        currentVisitorRef.current = null;
        setCurrentVisitor(null);
        setEventOutcome(null);
        setScreenShake('NONE');

        if (nextFloor === 10) {
          showToast(
            'INFO',
            '【管理室通達】10F 到着・追加通達下達',
            '『規程改定の追加通達（2通）を下達した。内容を確認し、10階の検問を開始しろ。』',
            2600
          );
          setActiveSubtitle(
            '『【10F 待機所】追加通達（2通）を下達した。確認完了後、「▼ 検問開始（応答）」を押して10階の検問を開始しろ。』'
          );
          if (scrapToastTimerRef.current) {
            window.clearTimeout(scrapToastTimerRef.current);
          }
          scrapToastTimerRef.current = window.setTimeout(() => {
            showToast(
              'DANGER',
              STORY_TEXTS.notices.prepareDoorScrapToast.floor10Title,
              STORY_TEXTS.notices.prepareDoorScrapToast.floor10Message,
              4000
            );
          }, 2700);
        } else {
          showToast(
            'INFO',
            '【管理室通達】5F 到着・追加通達下達',
            '『低層階の追加通達（1通）を下達した。確認完了後、5階の検問を開始しろ。』',
            2600
          );
          setActiveSubtitle(
            '『【5F 待機所】低層階の追加通達（1通）を確認しろ。確認後、「▼ 検問開始（応答）」を押して5階の検問を開始しろ。』'
          );
          // 管理室アナウンスとは独立して、扉の隙間から油汚れの配電図裏書が滑り込んでくる通知を出す
          if (scrapToastTimerRef.current) {
            window.clearTimeout(scrapToastTimerRef.current);
          }
          scrapToastTimerRef.current = window.setTimeout(() => {
            showToast(
              'DANGER',
              STORY_TEXTS.notices.prepareDoorScrapToast.floor5Title,
              STORY_TEXTS.notices.prepareDoorScrapToast.floor5Message,
              4200
            );
          }, 2700);
        }

        setGameState('PREPARE');
        return;
      }

      // 通常階（14〜11F、9〜6F、4〜2F）：訪問者を選出して ARRIVING へ
      const nextVisitor = selectVisitorForFloor(
        nextFloor,
        recentVisitorIdsRef.current
      );
      recentVisitorIdsRef.current = [...recentVisitorIdsRef.current, nextVisitor.id];
      currentVisitorRef.current = nextVisitor;
      setCurrentVisitor(nextVisitor);
      closeClicksRemainingRef.current = nextVisitor.requiredCloseClicks;
      setCloseClicksRemaining(nextVisitor.requiredCloseClicks);
      setIsPeekTransformed(false);
      isPeekTransformedRef.current = false;
      peekFreezeTicksRef.current = 0;
      setEventOutcome(null);
      setGameState('ARRIVING');
    },
    [showToast]
  );

  // 1. MOVING フェーズの管理（2F→1Fの「鍵となる彼女」第2の試練 ＋ 通常の下降中イベント）
  useEffect(() => {
    if (gameState !== 'MOVING') return;
    // 1F突破→B1F突入の演出中は通常降下ロジックで字幕・揺れを上書きしない
    if (floor <= 1) return;

    soundManager.startMotorDrone();
    setScreenShake('SUBTLE');
    setJumpscareFlash(false);
    setMovingEvent(null);
    movingEventRef.current = null;
    setIsKeyWomanAlertActive(false);

    const passengers = activePassengersRef.current;
    const keyWomanPassenger = passengers.find((p) => p.visitor.isKeyWoman);
    const pendingRequester = passengers.find(
      (p) => p.pendingRequest && !p.requestFulfilled
    );
    const sleeperPassenger = passengers.find((p) => p.visitor.isCabinSleeper);

    // 1回の移動につき最大1つまでのイベント選出
    let scheduledEvent: MovingCabinEvent | null = null;
    const quietStreak = floorsSinceLastMovingEventRef.current;

    if (floor === 2 && keyWomanPassenger) {
      // ★ 2F → 1F 固定クライマックスイベント（第2の試練：3.5秒間、非常ベルを押さずに耐え抜く）
      scheduledEvent = {
        id: `key-woman-trial-${Date.now()}`,
        type: 'MIRROR_GHOST',
        requiredAction: 'BELL',
        timeLeftMs: KEY_WOMAN_MIRROR_WINDOW_MS,
        maxTimeMs: KEY_WOMAN_MIRROR_WINDOW_MS,
        status: 'ACTIVE',
        isKeyWomanTrial: true,
        promptText: STORY_TEXTS.controlRoom.mirrorTrapPromptText,
        targetPassengerId: keyWomanPassenger.visitor.id,
      };
    } else if (pendingRequester && pendingRequester.pendingRequest) {
      // 同乗者の車内要求（換気要求）
      scheduledEvent = {
        id: `req-${Date.now()}`,
        type: 'PASSENGER_REQUEST',
        requiredAction: pendingRequester.pendingRequest.requiredAction,
        timeLeftMs: EVENT_MOVING_WINDOW_MS,
        maxTimeMs: EVENT_MOVING_WINDOW_MS,
        status: 'ACTIVE',
        promptText: pendingRequester.pendingRequest.promptText,
        targetPassengerId: pendingRequester.visitor.id,
      };
    } else if (
      floor <= 5 &&
      floor > 2 &&
      mirrorGhostTriggeredCountRef.current < 1 &&
      (sleeperPassenger ||
        (passengers.length > 0 && ((quietStreak >= 1 && Math.random() < 0.65) || floor <= 3)) ||
        (passengers.length === 0 && floor <= 4 && ((quietStreak >= 1 && Math.random() < 0.60) || floor === 3)))
    ) {
      // 非常ベル対応イベント（5階〜3階・鏡面怪異）
      mirrorGhostTriggeredCountRef.current += 1;
      const targetPassenger = sleeperPassenger || (passengers.length > 0 ? passengers[0] : null);
      const ghostPrompts = targetPassenger
        ? [
            '「『……ねえ、もう死んでるのに何階へ行くの？ ……後ろ、振り向かないでね』」『扉の鏡面に異常個体の映り込みを確認した。直ちに【非常ベル】を押し、防衛レーザーを照射しろ。』',
            '「『……クスクス、あなたのすぐ後ろ、すごく冷たいでしょう？』」『金属扉の鏡面に異常個体の映り込みを確認した。直ちに【非常ベル】を押し、防衛レーザーを照射しろ。』',
          ]
        : [
            '「『……ふふ、ひとりぼっちだと思った？ あなたの後ろ、立ってるよ』」『扉の鏡面に異常な影を確認した。直ちに【非常ベル】を押し、防衛レーザーを照射しろ。』',
            '「『……クスクス、後ろ……振り向かないでね』」『金属扉の鏡面に接近する影を確認した。直ちに【非常ベル】を押し、防衛レーザーを照射しろ。』',
          ];
      scheduledEvent = {
        id: `mirror-${Date.now()}`,
        type: 'MIRROR_GHOST',
        requiredAction: 'BELL',
        timeLeftMs: EVENT_MOVING_WINDOW_MS,
        maxTimeMs: EVENT_MOVING_WINDOW_MS,
        status: 'ACTIVE',
        promptText: ghostPrompts[Math.floor(Math.random() * ghostPrompts.length)],
        targetPassengerId: targetPassenger?.visitor.id,
      };
    } else if (
      floor < 15 &&
      floor > 2 &&
      miasmaTriggeredCountRef.current < 2 &&
      ((quietStreak >= 2 && Math.random() < 0.20) || quietStreak >= 5)
    ) {
      // 瘴気の発生（急速換気対応）
      miasmaTriggeredCountRef.current += 1;
      scheduledEvent = {
        id: `miasma-${Date.now()}`,
        type: 'MIASMA',
        requiredAction: 'FAN',
        timeLeftMs: EVENT_MOVING_WINDOW_MS,
        maxTimeMs: EVENT_MOVING_WINDOW_MS,
        status: 'ACTIVE',
        promptText:
          '『【管理室警報】床下より有毒な瘴気の噴出を検知した。直ちに【急速換気】ボタンを押して強制排気しろ。』',
      };
    }

    // イベントが発生しない静かな下降回（緩急をつける）
    if (!scheduledEvent) {
      floorsSinceLastMovingEventRef.current += 1;
      if (passengers.length > 0) {
        setActiveSubtitle(
          `『【下降監視】${floor - 1}階へ降下中……（車内収容者 ${passengers.length} 名・監視カメラ異常なし）』`
        );
      } else {
        setActiveSubtitle(`『【下降監視】${floor - 1}階へ降下中……（監視カメラ異常なし）』`);
      }

      let quietRemaining = QUIET_MOVING_DURATION_MS;
      const quietTimer = window.setInterval(() => {
        if (isPausedRef.current) return;
        quietRemaining -= 50;
        if (quietRemaining <= 0) {
          window.clearInterval(quietTimer);
          completeDescentToNextFloor(floor);
        }
      }, 50);

      return () => window.clearInterval(quietTimer);
    }

    // イベントが発生する下降回（降下時間を長く重厚にする）
    floorsSinceLastMovingEventRef.current = 0;
    setActiveSubtitle(`『【異常降下】${floor - 1}階へ下降中……（シャフト駆動音に変調を検知）』`);

    let countdownInterval: number | null | undefined = null;
    let finishInterval: number | null | undefined = null;
    let onsetRemaining = 850;
    let onsetTriggered = false;

    // 下降開始から850ms後にガタガタと激しく揺れてイベント発生
    const onsetInterval = window.setInterval(() => {
      if (isPausedRef.current || onsetTriggered) return;
      onsetRemaining -= 50;
      if (onsetRemaining <= 0) {
        onsetTriggered = true;
        window.clearInterval(onsetInterval);

        if (!scheduledEvent) return;

        if (scheduledEvent.type === 'PASSENGER_REQUEST') {
          const stillPending = activePassengersRef.current.some(
            (p) =>
              p.visitor.id === scheduledEvent.targetPassengerId &&
              p.pendingRequest &&
              !p.requestFulfilled
          );
          if (!stillPending) {
            let earlyDoneRemaining = Math.max(1000, QUIET_MOVING_DURATION_MS - 850);
            finishInterval = window.setInterval(() => {
              if (isPausedRef.current) return;
              earlyDoneRemaining -= 50;
              if (earlyDoneRemaining <= 0) {
                if (finishInterval) {
                  window.clearInterval(finishInterval);
                  finishInterval = null;
                }
                completeDescentToNextFloor(floor);
              }
            }, 50);
            return;
          }
        }

        soundManager.playElevatorJolt();
        setScreenShake('VIOLENT');
        window.setTimeout(() => {
          setScreenShake('SUBTLE');
        }, 320);

        if (scheduledEvent.type === 'MIASMA') {
          soundManager.startMiasmaHeartbeat();
        } else if (scheduledEvent.type === 'MIRROR_GHOST') {
          if (scheduledEvent.isKeyWomanTrial) {
            soundManager.playComplaintBuzzer();
            showToast(
              'DANGER',
              STORY_TEXTS.controlRoom.mirrorTrapToastTitle,
              STORY_TEXTS.controlRoom.mirrorTrapToastMessage,
              3500
            );
          } else {
            soundManager.playMirrorGhostAppear();
          }
        }

        movingEventRef.current = scheduledEvent;
        setMovingEvent(scheduledEvent);
        setActiveSubtitle(scheduledEvent.promptText);

        const tickMs = 50;
        countdownInterval = window.setInterval(() => {
          if (isPausedRef.current) return;
          const currentEv = movingEventRef.current;
          if (!currentEv) return;

          // プレイヤーが既に対処成功（RESOLVED）した場合：十分な余韻と静寂をおいてから次の階へ到着（3.2秒）
          if (currentEv.status === 'RESOLVED') {
            if (countdownInterval) {
              window.clearInterval(countdownInterval);
              countdownInterval = null;
            }
            let successRemaining = 3200;
            finishInterval = window.setInterval(() => {
              if (isPausedRef.current) return;
              successRemaining -= 50;
              if (successRemaining <= 0) {
                if (finishInterval) {
                  window.clearInterval(finishInterval);
                  finishInterval = null;
                }
                completeDescentToNextFloor(floor);
              }
            }, 50);
            return;
          }

          if (currentEv.status !== 'ACTIVE') return;

          const delta = isModalOpenRef.current ? tickMs * 0.25 : tickMs;
          const nextTime = Math.max(0, currentEv.timeLeftMs - delta);

          if (nextTime <= 0) {
            if (countdownInterval) {
              window.clearInterval(countdownInterval);
              countdownInterval = null;
            }

            // ★ 2F→1F「鍵となる彼女」第2の試練：3.5秒間、非常ベルを押さずに最後まで耐え抜いた場合（01F一時停止イベントへ到達！）
            if (currentEv.isKeyWomanTrial) {
              soundManager.stopAnomalyPresence();
              soundManager.playPeekInnocentReveal();
              setScreenShake('NONE');
              setJumpscareFlash(false);
              trueEndUnlockedRef.current = true;
              setEndingType('TRUE');

              const survivedEv: MovingCabinEvent = {
                ...currentEv,
                timeLeftMs: 0,
                status: 'RESOLVED',
              };
              movingEventRef.current = survivedEv;
              setMovingEvent(survivedEv);

              setActiveSubtitle(STORY_TEXTS.controlRoom.mirrorTrapSurvivedWomanLine);
              showToast(
                'DANGER',
                STORY_TEXTS.controlRoom.mirrorTrapSurvivedSystemToastTitle,
                STORY_TEXTS.controlRoom.mirrorTrapSurvivedSystemToastMessage,
                3400
              );

              let trueWaitRemaining = 2600;
              finishInterval = window.setInterval(() => {
                if (isPausedRef.current) return;
                trueWaitRemaining -= 50;
                if (trueWaitRemaining <= 0) {
                  if (finishInterval) {
                    window.clearInterval(finishInterval);
                    finishInterval = null;
                  }
                  completeDescentToNextFloor(floor);
                }
              }, 50);
              return;
            }

            // 通常の制限時間切れ（FAILED）：十分な余韻を持たせてから次の階へ到着（3.4秒）
            const failedEv: MovingCabinEvent = {
              ...currentEv,
              timeLeftMs: 0,
              status: 'FAILED',
            };
            movingEventRef.current = failedEv;
            setMovingEvent(failedEv);

            if (currentEv.type === 'MIASMA') {
              soundManager.stopMiasmaHeartbeat();
              soundManager.playJumpscareNoise();
              setJumpscareFlash(true);
              setScreenShake('VIOLENT');
              const nextSanity = Math.max(0, sanityRef.current - 1);
              setSanity(nextSanity);
              setActiveSubtitle(
                '『強制排気の未実施を確認した。有毒ガスの吸引により、精神状態が低下した。』（精神力 -1）'
              );
              showToast(
                'DANGER',
                '【管理室記録】毒素吸引（精神力 -1）',
                '『規定時間内の強制排気が行われなかった。業務過失として記録する。』'
              );
            } else if (currentEv.type === 'MIRROR_GHOST') {
              soundManager.playJumpscareNoise();
              setJumpscareFlash(true);
              setScreenShake('VIOLENT');
              const nextSanity = Math.max(0, sanityRef.current - 1);
              setSanity(nextSanity);
              if (currentEv.targetPassengerId) {
                setActivePassengers((prev) =>
                  prev.filter((p) => p.visitor.id !== currentEv.targetPassengerId)
                );
              }
              setActiveSubtitle(
                '「『見ィつけた』」――『防衛レーザーの照射遅れにより、車内への侵蝕を許した。』（精神力 -1）'
              );
              showToast(
                'DANGER',
                '【背後侵蝕】防衛照射失敗（精神力 -1）',
                '『指示通りの照射が行われなかった。業務過失として記録する。』'
              );
            } else if (currentEv.type === 'PASSENGER_REQUEST') {
              soundManager.playComplaintBuzzer();
              setScreenShake('SUBTLE');
              const nextComplaints = Math.min(
                MAX_COMPLAINTS,
                complaintsRef.current + 1
              );
              setComplaints(nextComplaints);
              setActivePassengers((prev) =>
                prev.map((p) =>
                  p.visitor.id === currentEv.targetPassengerId
                    ? { ...p, requestFulfilled: true }
                    : p
                )
              );
              setActiveSubtitle(
                '「『おい、無視するな！管理室に言いつけてやる！』」『乗客の要求に対する未対応を確認した。苦情として記録する。』'
              );
              showToast(
                'COMPLAINT',
                `【管理室警告】要求無視 (${nextComplaints}/${MAX_COMPLAINTS})`,
                '『乗客からの換気要請への未対処を確認した。規定違反として記録する。』'
              );
            }

            let failRemaining = 3400;
            finishInterval = window.setInterval(() => {
              if (isPausedRef.current) return;
              failRemaining -= 50;
              if (failRemaining <= 0) {
                if (finishInterval) {
                  window.clearInterval(finishInterval);
                  finishInterval = null;
                }
                completeDescentToNextFloor(floor);
              }
            }, 50);
            return;
          }

          const updatedEv: MovingCabinEvent = {
            ...currentEv,
            timeLeftMs: nextTime,
          };
          movingEventRef.current = updatedEv;
          setMovingEvent(updatedEv);
        }, tickMs);
      }
    }, 50);

    return () => {
      window.clearInterval(onsetInterval);
      if (countdownInterval) window.clearInterval(countdownInterval);
      if (finishInterval) window.clearInterval(finishInterval);
    };
  }, [gameState, floor, completeDescentToNextFloor, showToast]);

  // 2. ARRIVING フェーズの管理（到着音が鳴り、一瞬扉に階数が浮かび上がった後に扉が12%まで開く）
  useEffect(() => {
    if (gameState !== 'ARRIVING') return;

    setScreenShake('NONE');
    setIsPeekTransformed(false);
    isPeekTransformedRef.current = false;
    peekFreezeTicksRef.current = 0;
    setIsKeyWomanAlertActive(false);

    const isAnomaly =
      currentVisitor?.category === 'ANOMALY' ||
      (currentVisitor?.requiredCloseClicks ?? 1) > 1;
    soundManager.playArrivalChime(isAnomaly);

    // 最初は扉を閉じたまま（0%）にして、扉の中央に到着階数を一瞬浮かび上がらせる
    doorPercentRef.current = 0;
    setDoorOpenPercent(0);
    setIsArrivingFlash(true);
    setActiveSubtitle(`『【${floor}F 到着】昇降機が停止した。監視を続けろ。』`);

    let arrivingElapsed = 0;
    let doorSlideStarted = false;

    const timer = window.setInterval(() => {
      if (isPausedRef.current) return;
      arrivingElapsed += 50;

      // 到着音が鳴り、階数が一瞬浮かび上がった後（ARRIVING_FLASH_MS 経過後）に扉が12%まで開く
      if (!doorSlideStarted && arrivingElapsed >= ARRIVING_FLASH_MS) {
        doorSlideStarted = true;
        setIsArrivingFlash(false);
        soundManager.playDoorSlide(0.5, true);
        doorPercentRef.current = 12;
        setDoorOpenPercent(12);
        setActiveSubtitle(
          `『【${floor}F 到着】扉がわずかに開いた。相手の身元を通達と照合しろ。』`
        );
      }

      if (arrivingElapsed >= ARRIVING_DURATION_MS) {
        window.clearInterval(timer);
        setIsArrivingFlash(false);
        decisionLockedRef.current = false;
        setJudgingTimeLeftMs(JUDGING_DURATION_MS);
        if (currentVisitor) {
          setActiveSubtitle(currentVisitor.dialogue);

          // ★ 2階（2F）の「彼女」出現時：管理室からの猛烈な赤色点滅＆擬態怪異警報命令
          if (currentVisitor.isKeyWoman) {
            setIsKeyWomanAlertActive(true);
            soundManager.playComplaintBuzzer();
            setScreenShake('VIOLENT');
            setTimeout(() => setScreenShake('SUBTLE'), 360);
            showToast(
              'DANGER',
              STORY_TEXTS.controlRoom.floor2DoorAlertTitle,
              STORY_TEXTS.controlRoom.floor2DoorAlert,
              6500
            );
          } else {
            setIsKeyWomanAlertActive(false);
            // ★ 扉が隙間まで開き、怪異・怪物が姿を現した瞬間のホラー音響
            const isMonster =
              currentVisitor.category === 'ANOMALY' || currentVisitor.requiredCloseClicks > 1;
            if (isMonster) {
              const isPrying = currentVisitor.requiredCloseClicks > 1;
              soundManager.playMonsterArrival(isPrying);
              if (isPrying) {
                setScreenShake('VIOLENT');
                setJumpscareFlash(true);
                setTimeout(() => setJumpscareFlash(false), 160);
                setTimeout(() => setScreenShake('NONE'), 300);
              } else {
                setScreenShake('SUBTLE');
                setTimeout(() => setScreenShake('NONE'), 350);
              }
            }
          }
        }
        setGameState('JUDGING');
      }
    }, 50);

    return () => {
      window.clearInterval(timer);
      setIsArrivingFlash(false);
    };
  }, [gameState, floor, currentVisitor, showToast]);

  // 3. JUDGING フェーズ（8.0秒ベース ＋ 張り紙拡大中は0.25倍速 ＋ 65%覗き込み段階変化 ＋ こじ開け怪異の6秒強制開扉）
  useEffect(() => {
    if (gameState !== 'JUDGING') return;

    const intervalMs = 50;
    const timer = setInterval(() => {
      if (decisionLockedRef.current || isPausedRef.current) return;

      // モーダルを開いている間は時間の経過速度を 0.25倍速 に落とす
      const slowFactor = isModalOpenRef.current ? 0.25 : 1.0;
      const elapsedDelta = intervalMs * slowFactor;

      setJudgingTimeLeftMs((prev) => {
        const next = prev - elapsedDelta;
        if (next <= 0) {
          resolveJudgingDecision('TIMEOUT_BOARD');
          return 0;
        }
        return next;
      });

      const isPryingMonster = Boolean(
        currentVisitor && currentVisitor.requiredCloseClicks > 1
      );

      // OPENボタン長押し中（約1.8秒で12%→100%へ到達）、離すと12%へ戻る
      if (isHoldingOpenRef.current) {
        // 65%本性露呈直後の硬直ティック（プレイヤーが指を離す猶予を確保）
        if (peekFreezeTicksRef.current > 0) {
          peekFreezeTicksRef.current -= 1;
          return;
        }

        const isThreatRevealed =
          isPeekTransformedRef.current &&
          currentVisitor?.peekTransformation?.type === 'REVEAL_THREAT';
        const step = isThreatRevealed
          ? OPEN_HOLD_STEP_PER_50MS * 0.65
          : OPEN_HOLD_STEP_PER_50MS;

        const nextDoor = Math.min(100, doorPercentRef.current + step);
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);

        // ★ 扉が閾値（65%）を超えた瞬間の段階的変化（覗き込みの罠 / 善良な住人判明）
        const peekConfig = currentVisitor?.peekTransformation;
        if (
          peekConfig &&
          !isPeekTransformedRef.current &&
          nextDoor >= peekConfig.thresholdPercent
        ) {
          isPeekTransformedRef.current = true;
          setIsPeekTransformed(true);
          setActiveSubtitle(peekConfig.revealedDialogue);

          if (peekConfig.type === 'REVEAL_THREAT') {
            soundManager.stopDoorMotor();
            soundManager.playPeekRevealGlitch();
            setScreenShake('VIOLENT');
            setJumpscareFlash(true);
            setTimeout(() => setJumpscareFlash(false), 120);
            setTimeout(() => setScreenShake('NONE'), 280);
            // 100%に達する前にプレイヤーが指を離して閉め出せるよう約350ms開扉を一時停止
            peekFreezeTicksRef.current = 7;
          } else {
            soundManager.playPeekInnocentReveal();
          }
        }

        if (nextDoor >= 100) {
          soundManager.stopDoorMotor();
          soundManager.playDoorBumperStop();
          resolveJudgingDecision('BOARD');
        }
      } else if (isPryingMonster) {
        // ★ こじ開け怪異：何もしていないと約6秒（12% → 100%）で扉を無理やりこじ開けて侵入してくる
        const pryStep = PRYING_OPEN_STEP_PER_50MS * slowFactor;
        const nextDoor = Math.min(100, doorPercentRef.current + pryStep);
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);

        if (nextDoor >= 100) {
          soundManager.stopDoorMotor();
          soundManager.playDoorBumperStop();
          resolveJudgingDecision('TIMEOUT_BOARD');
        }
      } else if (doorPercentRef.current > 12) {
        const nextDoor = Math.max(12, doorPercentRef.current - 4.5);
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      soundManager.stopDoorMotor();
    };
  }, [gameState, currentVisitor, resolveJudgingDecision]);

  // 4. EVENT_RESULT フェーズ（判定結果の後、ゲームオーバー判定または休む間もなく次の階へ下降）
  useEffect(() => {
    if (gameState !== 'EVENT_RESULT') return;

    let resultRemaining = RESULT_DURATION_MS;
    const timer = window.setInterval(() => {
      if (isPausedRef.current) return;
      resultRemaining -= 50;
      if (resultRemaining <= 0) {
        window.clearInterval(timer);
        setJumpscareFlash(false);
        setScreenShake('NONE');

        if (sanityRef.current <= 0) {
          soundManager.playJumpscareNoise();
          setGameOverReason(
            `危険個体（${currentVisitor?.name || '不明'}）を車内に招き入れ、作業員の精神崩壊を確認した。規定に基づき昇降機を停止する。`
          );
          setGameState('GAMEOVER');
          return;
        }

        if (complaintsRef.current >= MAX_COMPLAINTS) {
          soundManager.playJumpscareNoise();
          setGameOverReason(
            '住人からの苦情通報が3回累積したため、管理室規程に基づき昇降機を完全封鎖・運行停止とした。'
          );
          setGameState('GAMEOVER');
          return;
        }

        if (doorPercentRef.current > 0) {
          soundManager.playDoorSlide(0.35, false);
          doorPercentRef.current = 0;
          setDoorOpenPercent(0);
          window.setTimeout(() => soundManager.playDoorLatchShut(), 280);
        }
        setGameState('MOVING');
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [gameState, currentVisitor]);

  // 5. FINAL_DOOR フェーズ（01F一時停止→閉扉でB1F突破／01F通常またはB1Fにて手動長押し開扉→タップ進行エンディング）
  useEffect(() => {
    if (gameState !== 'FINAL_DOOR') return;

    setIsKeyWomanAlertActive(false);

    const intervalMs = 50;
    const timer = window.setInterval(() => {
      if (
        decisionLockedRef.current ||
        isPausedRef.current ||
        isAwaiting1FOverrideRef.current ||
        tapSequenceRef.current !== null
      ) {
        return;
      }

      if (isHoldingOpenRef.current) {
        const nextDoor = Math.min(
          100,
          doorPercentRef.current + FINAL_DOOR_OPEN_STEP_PER_50MS
        );
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);

        if (
          (trueEndUnlockedRef.current || floorRef.current <= 0) &&
          !b1fOpenWarningTriggeredRef.current &&
          nextDoor >= 15
        ) {
          b1fOpenWarningTriggeredRef.current = true;
          soundManager.playComplaintBuzzer();
          setActiveSubtitle(
            STORY_TEXTS.sequences.b1fArrival.doorOpenWarningSubtitle
          );
          showToast(
            'DANGER',
            STORY_TEXTS.sequences.b1fArrival.doorOpenWarningToastTitle,
            STORY_TEXTS.sequences.b1fArrival.doorOpenWarningToastMessage,
            3500
          );
        }

        // 100%まで開ききった瞬間のマルチエンディング・タップ進行イベント開始
        if (nextDoor >= 100) {
          decisionLockedRef.current = true;
          isHoldingOpenRef.current = false;
          setIsHoldingOpen(false);
          soundManager.stopDoorMotor();
          soundManager.playDoorBumperStop();

          if (trueEndUnlockedRef.current || floorRef.current <= 0) {
            // ② トゥルーエンディング（B1F）：管理室の通信回線が焼き切れ、夜の冷気と街灯の夜景を背景にタップ進行へ
            soundManager.playSystemShortCircuitExplosion();
            soundManager.stopCabinRattle();
            soundManager.stopMotorDrone();
            soundManager.stopAnomalyPresence();
            setScreenShake('NONE');
            soundManager.startNightEscapeAmbience();

            setActivePassengers([]);
            const escapeLines = STORY_TEXTS.sequences.buildTrueB1FEscapeLines();
            const escapeSeq = {
              kind: 'TRUE_B1F_ESCAPE' as const,
              lines: escapeLines,
              index: 0,
            };
            tapSequenceRef.current = escapeSeq;
            setTapSequence(escapeSeq);
            setActiveSubtitle(escapeLines[0].text);
            showToast(
              'INFO',
              '【通信遮断】監視システム完全停止',
              '制御回線が焼き切れ、搬入口のシャッターの向こうから冷たい夜風が吹き込んだ。',
              3600
            );
          } else {
            // ① 通常エンディング（01F）：合わせ鏡のように続く無人の箱を前に、タップ進行モノローグの後で15Fへ高速巻き戻し
            soundManager.playComplaintBuzzer();
            setActivePassengers([]);
            const loopLines = STORY_TEXTS.sequences.buildNormal1FLoopLines(
              shiftCountRef.current
            );
            const loopSeq = {
              kind: 'NORMAL_1F_LOOP' as const,
              lines: loopLines,
              index: 0,
            };
            tapSequenceRef.current = loopSeq;
            setTapSequence(loopSeq);
            setActiveSubtitle(loopLines[0].text);
          }
        }
      } else if (doorPercentRef.current > 0) {
        // 指を離すと重々しい扉がじわじわと閉まり戻る
        const nextDoor = Math.max(0, doorPercentRef.current - 0.8);
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
      soundManager.stopDoorMotor();
    };
  }, [gameState, showToast]);

  // 操作盤ハンドラ：開（OPEN）長押し開始・終了
  const handleStartHoldOpen = useCallback(() => {
    const gs = gameStateRef.current;
    if (
      isPausedRef.current ||
      (gs !== 'JUDGING' && gs !== 'FINAL_DOOR') ||
      decisionLockedRef.current ||
      isAwaiting1FOverrideRef.current ||
      tapSequenceRef.current !== null
    ) {
      return;
    }
    if (!isHoldingOpenRef.current) {
      soundManager.playButtonClick('OPEN');
      soundManager.startDoorMotor('OPEN');
    }
    isHoldingOpenRef.current = true;
    setIsHoldingOpen(true);
  }, []);

  const handleStopHoldOpen = useCallback(() => {
    if (!isHoldingOpenRef.current) return;
    isHoldingOpenRef.current = false;
    setIsHoldingOpen(false);
    soundManager.stopDoorMotor();
    const gs = gameStateRef.current;
    if (
      (gs === 'JUDGING' && !decisionLockedRef.current && doorPercentRef.current > 12) ||
      (gs === 'FINAL_DOOR' && !decisionLockedRef.current && doorPercentRef.current > 0)
    ) {
      soundManager.playDoorSlide(0.35, false);
    }
  }, []);

  // 操作盤ハンドラ：閉（CLOSE）押下（JUDGING閉鎖 ＋ 01F停止リミッター強制突破→B1F突入）
  const handlePressClose = useCallback(() => {
    if (isPausedRef.current || tapSequenceRef.current !== null) return;
    soundManager.playButtonClick('CLOSE');

    // ★ 01F一時停止イベント完了後：閉扉ボタン押下で1Fリミッターを踏み抜き地下B1Fへ急落する
    if (gameStateRef.current === 'FINAL_DOOR' && isAwaiting1FOverrideRef.current) {
      isAwaiting1FOverrideRef.current = false;
      setIsAwaiting1FOverride(false);
      decisionLockedRef.current = true;
      setIsPlungingToB1F(true);
      soundManager.playB1FBreakthrough();
      soundManager.playSystemShortCircuitExplosion();
      soundManager.startMotorDrone();
      setScreenShake('VIOLENT');
      setJumpscareFlash(true);
      window.setTimeout(() => setJumpscareFlash(false), 450);

      setActiveSubtitle(STORY_TEXTS.sequences.floor1BreakthroughAlert.subtitle);
      showToast(
        'DANGER',
        STORY_TEXTS.sequences.floor1BreakthroughAlert.toastTitle,
        STORY_TEXTS.sequences.floor1BreakthroughAlert.toastMessage,
        2600
      );

      if (b1fTransitionTimerRef.current) {
        window.clearTimeout(b1fTransitionTimerRef.current);
      }
      b1fTransitionTimerRef.current = window.setTimeout(() => {
        b1fTransitionTimerRef.current = null;
        floorRef.current = 0; // B1F
        setFloor(0);
        setIsPlungingToB1F(false);
        setScreenShake('NONE');
        soundManager.stopMotorDrone();
        soundManager.playArrivalChime(false);
        setIsArrivingFlash(true);
        if (arrivingFlashTimeoutRef.current) {
          window.clearTimeout(arrivingFlashTimeoutRef.current);
        }
        arrivingFlashTimeoutRef.current = window.setTimeout(
          () => setIsArrivingFlash(false),
          ARRIVING_FLASH_MS
        );

        decisionLockedRef.current = false;
        b1fOpenWarningTriggeredRef.current = false;
        setActiveSubtitle(STORY_TEXTS.sequences.b1fArrival.subtitle);
        showToast(
          'DANGER',
          STORY_TEXTS.sequences.b1fArrival.toastTitle,
          STORY_TEXTS.sequences.b1fArrival.toastMessage,
          3800
        );
      }, 1850);
      return;
    }

    // 検問フェーズ（JUDGING）中の閉め出し操作
    if (gameStateRef.current !== 'JUDGING' || decisionLockedRef.current) return;

    const nextRemaining = closeClicksRemainingRef.current - 1;
    closeClicksRemainingRef.current = nextRemaining;
    setCloseClicksRemaining(nextRemaining);

    if (nextRemaining > 0) {
      soundManager.playDoorBang();
      setScreenShake('VIOLENT');
      setJumpscareFlash(true);
      setTimeout(() => {
        setJumpscareFlash(false);
      }, 140);
      setTimeout(() => {
        setScreenShake('NONE');
      }, 280);

      // 閉ボタンを押すごとに扉をグッと押し戻すが、手を止めると再び怪異がこじ開けてくる
      const pushedBackDoor = Math.max(8, doorPercentRef.current - 16);
      doorPercentRef.current = pushedBackDoor;
      setDoorOpenPercent(pushedBackDoor);
      setActiveSubtitle(
        `『【扉破壊警報】対象が扉をこじ開けようとしている。【閉扉】ボタンを連打し、直ちに遮断しろ。（残り ${nextRemaining} 回）』`
      );
    } else {
      resolveJudgingDecision('REJECT');
    }
  }, [resolveJudgingDecision, showToast]);

  // 操作盤ハンドラ：急速換気（FAN）ボタン（押すと3秒間だけ作動して自動停止＋空撃ちペナルティ）
  const handleToggleFan = useCallback(() => {
    if (
      isPausedRef.current ||
      isFanOnRef.current ||
      tapSequenceRef.current !== null
    ) {
      return; // ポーズ中・既に稼働中・ストーリー進行中なら無視
    }

    soundManager.playButtonClick('SWITCH');
    isFanOnRef.current = true;
    setIsFanOn(true);
    soundManager.startRapidVentilation(RAPID_FAN_DURATION_MS);

    if (fanTimerRef.current) {
      window.clearInterval(fanTimerRef.current);
    }
    let fanRemainingMs = RAPID_FAN_DURATION_MS;
    fanTimerRef.current = window.setInterval(() => {
      if (isPausedRef.current) return;
      fanRemainingMs -= 50;
      if (fanRemainingMs <= 0) {
        isFanOnRef.current = false;
        setIsFanOn(false);
        if (fanTimerRef.current) {
          window.clearInterval(fanTimerRef.current);
          fanTimerRef.current = null;
        }
      }
    }, 50);

    const currentEv = movingEventRef.current;
    const gs = gameStateRef.current;

    // 1. 下降中の「瘴気（MIASMA）」イベントへの対処
    if (
      gs === 'MOVING' &&
      currentEv &&
      currentEv.type === 'MIASMA' &&
      currentEv.status === 'ACTIVE'
    ) {
      soundManager.stopMiasmaHeartbeat();
      const resolvedEv: MovingCabinEvent = {
        ...currentEv,
        status: 'RESOLVED',
      };
      movingEventRef.current = resolvedEv;
      setMovingEvent(resolvedEv);
      setActiveSubtitle(
        '『【急速換気稼働】排気完了を確認した。そのまま下降を継続しろ。』'
      );
      return;
    }

    // 2. 同乗者の「換気要求（FAN）」への対処
    const targetPassenger = activePassengersRef.current.find(
      (p) =>
        p.pendingRequest &&
        !p.requestFulfilled &&
        p.pendingRequest.requiredAction === 'FAN'
    );
    if (targetPassenger && targetPassenger.pendingRequest) {
      const updatedPassengers = activePassengersRef.current.map((p) =>
        p.visitor.id === targetPassenger.visitor.id
          ? { ...p, requestFulfilled: true }
          : p
      );
      activePassengersRef.current = updatedPassengers;
      setActivePassengers(updatedPassengers);
      setActiveSubtitle(targetPassenger.pendingRequest.successText);

      if (
        currentEv &&
        currentEv.type === 'PASSENGER_REQUEST' &&
        currentEv.requiredAction === 'FAN' &&
        currentEv.status === 'ACTIVE'
      ) {
        const resolvedEv: MovingCabinEvent = {
          ...currentEv,
          status: 'RESOLVED',
        };
        movingEventRef.current = resolvedEv;
        setMovingEvent(resolvedEv);
      }
      return;
    }

    // 3. 空撃ちペナルティ（瘴気も換気要求もない平時に押し、同乗者がいる場合クレーム +1）
    const nonKeyPassengers = activePassengersRef.current.filter(
      (p) => !p.visitor.isKeyWoman
    );
    if (nonKeyPassengers.length > 0) {
      soundManager.playComplaintBuzzer();
      setScreenShake('SUBTLE');
      window.setTimeout(() => setScreenShake('NONE'), 300);

      const nextComplaints = Math.min(MAX_COMPLAINTS, complaintsRef.current + 1);
      setComplaints(nextComplaints);
      setActiveSubtitle(
        '「『ちょっと！ 異常もないのに風が強くてうるさいわ！ 管理室に通報するからね！』」『異常のない平時に換気装置を作動させるな。乗客の苦情として記録した。』'
      );
      showToast(
        'COMPLAINT',
        `【管理室警告】不要稼働通報 (${nextComplaints}/${MAX_COMPLAINTS})`,
        '『異常のない平時に強制排気を行うな。乗客から苦情が記録された。累積3件で運行停止とする。』'
      );

      if (nextComplaints >= MAX_COMPLAINTS && gs !== 'EVENT_RESULT') {
        soundManager.stopMotorDrone();
        soundManager.playJumpscareNoise();
        setGameOverReason(
          '異常のない平時に急速換気を使用したことによる苦情累積が3件に達したため、管理室規程に基づき昇降機を強制停止とした。'
        );
        setGameState('GAMEOVER');
      }
    } else {
      setActiveSubtitle(
        '『【管理室監視】異常のない平時に換気装置を作動させるな。指示された場合のみ使用しろ。』'
      );
    }
  }, [showToast]);

  // 操作盤ハンドラ：非常ベル押下（車内怪異の緊急排除 ＆ 2F→1F誘導トラップ分岐 ＆ 扉こじ開け怪異の威嚇）
  const handlePressBell = useCallback(() => {
    if (isPausedRef.current || tapSequenceRef.current !== null) return;
    soundManager.playEmergencyBell();
    setScreenShake('VIOLENT');
    setTimeout(() => setScreenShake('NONE'), 320);

    const currentEv = movingEventRef.current;
    const gs = gameStateRef.current;
    const visitor = currentVisitorRef.current;

    // 1. 下降中の「鏡面反射 / 擬態誘導（MIRROR_GHOST）」へのレーザー照射・非常処分
    if (
      gs === 'MOVING' &&
      currentEv &&
      currentEv.type === 'MIRROR_GHOST' &&
      currentEv.status === 'ACTIVE'
    ) {
      soundManager.playElevatorJolt();
      soundManager.stopAnomalyPresence();
      const resolvedEv: MovingCabinEvent = {
        ...currentEv,
        status: 'RESOLVED',
      };
      movingEventRef.current = resolvedEv;
      setMovingEvent(resolvedEv);

      if (currentEv.targetPassengerId) {
        setActivePassengers((prev) =>
          prev.filter((p) => p.visitor.id !== currentEv.targetPassengerId)
        );
      }

      // ★ 2F→1F「非常ベル誘導トラップ」で非常ベルを押してしまった場合：擬態怪異として処分され、通常ルート（1F）へ進む
      if (currentEv.isKeyWomanTrial) {
        trueEndUnlockedRef.current = false;
        setEndingType('NORMAL');
        setActiveSubtitle(
          STORY_TEXTS.controlRoom.mirrorTrapBellPressedSubtitle
        );
        showToast(
          'INFO',
          STORY_TEXTS.controlRoom.mirrorTrapBellPressedToastTitle,
          STORY_TEXTS.controlRoom.mirrorTrapBellPressedToastMessage,
          3600
        );
        return;
      }

      setActiveSubtitle(
        '『【防衛レーザー照射】背後の怪異の焼却を確認した。そのまま下降を継続しろ。』'
      );
      return;
    }

    // 2. 検問中（JUDGING）のこじ開け怪異に対する威嚇
    if (
      gs === 'JUDGING' &&
      visitor &&
      visitor.isThreat &&
      closeClicksRemainingRef.current > 1
    ) {
      closeClicksRemainingRef.current = 1;
      setCloseClicksRemaining(1);
      soundManager.stopPryingLoop();
      setActiveSubtitle(
        '『【防衛レーザー威嚇】アーク閃光により対象が怯んだ。直ちに【閉扉】を押して扉を閉め切れ。』'
      );
    }
  }, [showToast]);

  const isSlowMotionActive = gameState === 'JUDGING' && isInspectingModalOpen;
  const unlockedRules = useMemo(
    () => INITIAL_NOTICE_RULES.filter((r) => floor <= r.unlockedAtFloor),
    [floor]
  );
  const unreadNoticeCount = useMemo(
    () => unlockedRules.filter((r) => !readRuleIds.includes(r.id)).length,
    [unlockedRules, readRuleIds]
  );
  const unlockedMemos = useMemo(
    () => SCRAP_MEMOS.filter((m) => floor <= m.unlockedAtFloor),
    [floor]
  );
  const currentFloorMemo = useMemo(
    () => SCRAP_MEMOS.find((m) => m.unlockedAtFloor === floor),
    [floor]
  );
  const activeTapLine = useMemo(
    () => (tapSequence ? tapSequence.lines[tapSequence.index] ?? null : null),
    [tapSequence]
  );
  const evaluationResult = useMemo(
    () =>
      evaluateShiftPerformance({
        sanity,
        maxSanity: MAX_SANITY,
        complaints,
        boardedSafeCount,
        repelledThreatCount,
      }),
    [sanity, complaints, boardedSafeCount, repelledThreatCount]
  );

  return (
    <motion.div
      animate={
        screenShake === 'VIOLENT'
          ? {
              x: [0, -14, 14, -10, 10, -6, 6, 0],
              y: [0, 8, -8, 6, -6, 0],
            }
          : screenShake === 'SUBTLE'
          ? {
              y: [0, -1.5, 1.5, -1, 1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={
        screenShake === 'VIOLENT'
          ? { duration: 0.45, repeat: gameState === 'EVENT_RESULT' ? 1 : 0 }
          : screenShake === 'SUBTLE' && gameState === 'MOVING'
          ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.25 }
      }
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between metal-wall select-none touch-manipulation"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        willChange: 'transform',
      }}
    >
      {/* 全体の薄汚れた錆・ビネット・走査線エフェクト */}
      <div className="absolute inset-0 grime-overlay z-40 pointer-events-none" />
      <div className="absolute inset-0 scanlines z-40 pointer-events-none opacity-55" />

      {/* 検問中（JUDGING）に張り紙を拡大している間の「画面のフチが赤暗く脈打つ焦燥感演出」 */}
      <AnimatePresence>
        {isSlowMotionActive && (
          <motion.div
            id="slow-motion-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="fixed inset-0 z-55 pointer-events-none border-[14px] border-red-900/90 shadow-[inset_0_0_90px_rgba(185,28,28,0.85)]"
          />
        )}
      </AnimatePresence>

      {/* 画面上部のトースト通知（クレーム・チェックポイント・危険通知） */}
      <AnimatePresence>
        {toastAlert && (
          <motion.div
            key={toastAlert.id}
            id="top-toast-alert"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.22 }}
            className={`fixed top-[calc(68px+env(safe-area-inset-top,0px))] md:top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 md:px-4 py-2 md:py-2.5 rounded shadow-[0_10px_35px_rgba(0,0,0,0.95)] border-2 flex items-center gap-2.5 md:gap-3 max-w-lg w-[94%] md:w-[92%] pointer-events-none ${
              toastAlert.type === 'COMPLAINT'
                ? 'bg-red-950/95 border-red-500 text-red-100'
                : toastAlert.type === 'DANGER'
                ? 'bg-red-900/95 border-red-400 text-white'
                : 'bg-stone-900/95 border-amber-500 text-amber-100'
            }`}
          >
            {toastAlert.type === 'COMPLAINT' || toastAlert.type === 'DANGER' ? (
              <MessageSquareWarning className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <Bell className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-wide truncate">
                {toastAlert.title}
              </div>
              <div className="text-[11px] md:text-xs opacity-90 leading-snug">
                {toastAlert.message}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 怪異侵入時の赤いジャンプスケアフラッシュ演出 */}
      <AnimatePresence>
        {jumpscareFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.85, 0.2, 0.75, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-40 bg-red-900/70 pointer-events-none border-[16px] border-red-600/80"
          />
        )}
      </AnimatePresence>

      {/* B1F回路過負荷突破時の高圧スパーク＆点滅フラッシュ */}
      <AnimatePresence>
        {isPlungingToB1F && (
          <motion.div
            id="b1f-breakthrough-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.95, 0.25, 0.9, 0.35, 0.85] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, repeat: Infinity }}
            className="fixed inset-0 z-45 pointer-events-none border-[12px] border-amber-400/90 bg-sky-400/15 shadow-[inset_0_0_95px_rgba(251,191,36,0.75)]"
          />
        )}
      </AnimatePresence>

      {/* 1. 最上部：階層インジケーター＆SHIFT＆精神安定度＆通報累積ヘッダー */}
      <FloorIndicator
        floor={floor}
        shiftCount={shiftCount}
        gameState={gameState}
        sanity={sanity}
        maxSanity={MAX_SANITY}
        complaints={complaints}
        maxComplaints={MAX_COMPLAINTS}
        judgingTimeLeftMs={judgingTimeLeftMs}
        judgingMaxTimeMs={JUDGING_DURATION_MS}
        isSlowMotion={isSlowMotionActive}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        isAwaiting1FOverride={isAwaiting1FOverride}
      />

      {/* 2. メインエリア：PCは3カラム（左:通達 中:扉 右:操作盤）、スマホ縦画面は扉が大きく中央に表示 */}
      <main className="relative z-20 flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
        {/* デスクトップ左側パネル：張り紙・隙間の紙片一覧 */}
        <div className="hidden md:block md:col-span-3 h-full overflow-hidden">
          <NoticeBoard
            rules={INITIAL_NOTICE_RULES}
            scrapMemos={SCRAP_MEMOS}
            currentFloor={floor}
            readRuleIds={readRuleIds}
            onOpenRule={handleOpenRule}
            onOpenManual={handleOpenManual}
            onOpenMemo={handleOpenMemo}
          />
        </div>

        {/* 中央メイン：エレベーターの両開き金属扉（端末の画面高に合わせて自動伸縮） */}
        <div className="flex-1 min-h-0 md:col-span-6 md:h-full overflow-hidden relative">
          <ElevatorDoor
            doorOpenPercent={doorOpenPercent}
            floor={floor}
            gameState={gameState}
            currentVisitor={currentVisitor}
            closeClicksRemaining={closeClicksRemaining}
            isHoldingOpen={isHoldingOpen}
            isPeekTransformed={isPeekTransformed}
            movingEvent={movingEvent}
            isFanOn={isFanOn}
            isArrivingFlash={isArrivingFlash}
            isKeyWomanAlertActive={isKeyWomanAlertActive}
            currentFloorMemo={currentFloorMemo}
            onOpenMemo={handleOpenMemo}
          />
        </div>

        {/* デスクトップ右側パネル：スリム操作盤 */}
        <div className="hidden md:block md:col-span-3 h-full overflow-hidden">
          <ControlPanel
            gameState={gameState}
            unreadNoticeCount={unreadNoticeCount}
            doorOpenPercent={doorOpenPercent}
            isHoldingOpen={isHoldingOpen}
            isKeyWomanAlertActive={isKeyWomanAlertActive}
            onStartDescent={handleStartDescent}
            onStartHoldOpen={handleStartHoldOpen}
            onStopHoldOpen={handleStopHoldOpen}
            onPressClose={handlePressClose}
            closeClicksRemaining={closeClicksRemaining}
            requiredCloseClicks={currentVisitor?.requiredCloseClicks ?? 1}
            isFanOn={isFanOn}
            onToggleFan={handleToggleFan}
            onPressBell={handlePressBell}
            activePassengers={activePassengers}
            movingEvent={movingEvent}
            variant="desktop"
            isAwaiting1FOverride={isAwaiting1FOverride}
            isTapDialogueActive={Boolean(tapSequence)}
          />
        </div>
      </main>

      {/* 3. 中段（モバイル）／下部（PC）：訪問者のセリフ ＆ 車内同乗者ステータス */}
      <BottomConsole
        gameState={gameState}
        currentVisitor={currentVisitor}
        activeSubtitle={activeSubtitle}
        eventOutcome={eventOutcome}
        activePassengers={activePassengers}
        movingEvent={movingEvent}
        activeTapLine={activeTapLine}
      />

      {/* 4. モバイル縦画面専用：最下部 親指操作コントロールエリア（左:文書ボタン群 / 右:扉・設備操作盤） */}
      <section
        aria-label="モバイル操作パネル"
        className="relative z-30 md:hidden shrink-0 grid grid-cols-12 gap-1.5 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] metal-panel-surface border-t border-stone-800"
      >
        <div className="col-span-4 min-w-0">
          <MobileDocButtons
            rules={INITIAL_NOTICE_RULES}
            scrapMemos={SCRAP_MEMOS}
            currentFloor={floor}
            readRuleIds={readRuleIds}
            onOpenRuleList={handleOpenRuleList}
            onOpenManual={handleOpenManual}
            onOpenMemoList={handleOpenMemoList}
          />
        </div>
        <div className="col-span-8 min-w-0">
          <ControlPanel
            gameState={gameState}
            unreadNoticeCount={unreadNoticeCount}
            doorOpenPercent={doorOpenPercent}
            isHoldingOpen={isHoldingOpen}
            isKeyWomanAlertActive={isKeyWomanAlertActive}
            onStartDescent={handleStartDescent}
            onStartHoldOpen={handleStartHoldOpen}
            onStopHoldOpen={handleStopHoldOpen}
            onPressClose={handlePressClose}
            closeClicksRemaining={closeClicksRemaining}
            requiredCloseClicks={currentVisitor?.requiredCloseClicks ?? 1}
            isFanOn={isFanOn}
            onToggleFan={handleToggleFan}
            onPressBell={handlePressBell}
            activePassengers={activePassengers}
            movingEvent={movingEvent}
            variant="mobile"
            isAwaiting1FOverride={isAwaiting1FOverride}
            isTapDialogueActive={Boolean(tapSequence)}
          />
        </div>
      </section>

      {/* 共通モーダル：保安通達一覧・詳細 ／ 運行手引書 ／ 隙間の紙片 */}
      <NoticeModals
        modalState={inspectModalState}
        unlockedRules={unlockedRules}
        unlockedMemos={unlockedMemos}
        readRuleIds={readRuleIds}
        gameState={gameState}
        judgingTimeLeftMs={judgingTimeLeftMs}
        onSelectRule={handleOpenRule}
        onSelectMemo={handleOpenMemo}
        onClose={handleCloseModal}
      />

      {/* 01F以降 ストーリー＆エンディング タップ進行オーバーレイ（上部背景・夜景/鏡面を遮らない下部配置） */}
      <AnimatePresence>
        {activeTapLine &&
          tapSequence &&
          gameState === 'FINAL_DOOR' &&
          !isInspectingModalOpen &&
          !isPaused && (
            <motion.div
              id="tap-dialogue-backdrop"
              role="button"
              tabIndex={0}
              aria-label="画面タップで会話を進める"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={advanceTapSequence}
              className="fixed inset-x-0 bottom-0 top-[76px] md:top-14 z-45 cursor-pointer flex flex-col justify-end p-2.5 sm:p-5 bg-gradient-to-t from-black/85 via-black/18 to-transparent select-none"
            >
              <motion.div
                key={activeTapLine.id}
                id="tap-dialogue-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                className={`max-w-2xl w-full mx-auto rounded-xs border-2 p-3 sm:p-4 shadow-[0_14px_45px_rgba(0,0,0,0.95)] font-mincho backdrop-blur-[2px] ${
                  activeTapLine.speakerType === 'SYSTEM'
                    ? 'bg-stone-950/92 border-red-700/90 text-red-100'
                    : activeTapLine.speakerType === 'WOMAN'
                    ? 'bg-stone-950/92 border-amber-500/85 text-amber-50'
                    : 'bg-stone-950/92 border-slate-500/80 text-stone-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/10 pb-1">
                  <span
                    className={`text-[10px] sm:text-xs font-black tracking-wider px-2 py-0.5 rounded-xs border ${
                      activeTapLine.speakerType === 'SYSTEM'
                        ? 'bg-red-950/90 border-red-600/80 text-red-200'
                        : activeTapLine.speakerType === 'WOMAN'
                        ? 'bg-amber-950/90 border-amber-600/80 text-amber-200'
                        : 'bg-slate-900 border-slate-600/80 text-slate-200'
                    }`}
                  >
                    {activeTapLine.speakerLabel}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-400 tracking-wider">
                    {STORY_TEXTS.bottomConsole.tapDialogueHeader(
                      tapSequence.kind === 'TRUE_1F_STOP'
                        ? '01F 一時停止'
                        : tapSequence.kind === 'TRUE_B1F_ESCAPE'
                        ? '地下搬入口（B1F）'
                        : '01F 到着扉',
                      tapSequence.index,
                      tapSequence.lines.length
                    )}
                  </span>
                </div>

                <p className="text-xs sm:text-sm md:text-base font-bold leading-relaxed min-h-[3.2em]">
                  {activeTapLine.text}
                </p>

                <div className="mt-1.5 flex items-center justify-end">
                  <span
                    id="tap-dialogue-next-indicator"
                    className="text-[11px] sm:text-xs font-black tracking-widest text-amber-400 animate-pulse"
                  >
                    ▼ TAP / CLICK
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* エンディング遷移時の暗転（BLACKOUT）／ホワイトアウト（WHITEOUT）オーバーレイ */}
      <AnimatePresence>
        {endingOverlayFade !== 'NONE' && (
          <motion.div
            id="ending-fade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className={`fixed inset-0 z-55 pointer-events-none ${
              endingOverlayFade === 'WHITEOUT'
                ? 'bg-amber-50 shadow-[inset_0_0_120px_rgba(255,255,255,1)]'
                : 'bg-black'
            }`}
          />
        )}
      </AnimatePresence>

      {/* オーバーレイ画面：TITLE / GAMEOVER / CLEAR / PAUSE */}
      <AnimatePresence>
        {gameState === 'TITLE' && (
          <motion.div
            id="title-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/94 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
          >
            {/* 公文書・業務辞令書風の重厚なUI */}
            <div className="max-w-xl w-full max-h-[92dvh] flex flex-col metal-panel-surface border-2 border-stone-700 p-2 sm:p-3.5 shadow-[0_25px_70px_rgba(0,0,0,0.98)] relative my-auto shrink-0">
              <div className="aged-paper border-2 border-stone-800 p-3.5 sm:p-6 text-stone-900 font-mincho relative shadow-inner overflow-y-auto overscroll-contain touch-pan-y min-h-0 flex-1">
                {/* 上部：文書番号・SHIFTバッジ・朱印 */}
                <div className="flex items-start justify-between border-b-2 border-stone-800 pb-2.5 mb-3 sm:mb-4 gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-stone-700 tracking-widest block">
                      管理室 保安統制課 発令（機密第拾伍號）
                    </span>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-stone-950 tracking-wider mt-0.5">
                      第十五號昇降機
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span
                        id="title-shift-badge"
                        className="inline-flex items-center px-2 py-0.5 bg-stone-900 text-amber-400 border border-amber-700/80 font-seven-seg text-xs tracking-widest rounded-xs"
                      >
                        {STORY_TEXTS.title.shiftBadgePrefix}：{formatShiftCode(shiftCount)}
                      </span>
                      <span className="text-xs font-extrabold text-red-900 tracking-widest">
                        ― 夜間特別検問業務 辞令書 ―
                      </span>
                    </div>
                  </div>
                  <div className="border-2 border-red-800 text-red-800 font-extrabold text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rotate-[-5deg] shrink-0 text-center leading-tight">
                    <div>絶対服従</div>
                    <div className="text-[10px] border-t border-red-800 mt-0.5 pt-0.5">規程厳守</div>
                  </div>
                </div>

                {/* リード文 */}
                <p className="text-xs sm:text-sm text-stone-900 font-bold mb-3 sm:mb-4 leading-relaxed">
                  作業員に当ビル「第十五號昇降機」の夜間検問業務を命じる。15階から1階へ降下しながら、各階で乗車を求める者の身元を通達に基づき照合・選別しろ。判断の誤りは許されない。
                </p>

                {/* 罫線枠の業務要綱（3箇条） */}
                <div className="border-2 border-stone-800 divide-y divide-stone-700/80 bg-stone-900/5 text-xs leading-relaxed mb-4">
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-stone-950 block mb-0.5 font-bold">
                      【第一条：扉操作と身元照合】
                    </strong>
                    <span className="text-stone-800">
                      「開扉」を長押しして隙間を広げ、名札・服装・眼光を監視しろ。正規住人のみ全開で収容し、規程違反者や怪異は直ちに「閉扉」で遮断・排除しろ。（扉に手をかけてこじ開ける個体には「閉扉」を連打して押し返せ）
                    </span>
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-stone-950 block mb-0.5 font-bold">
                      【第二条：管理室通達の遵守】
                    </strong>
                    <span className="text-stone-800">
                      15階・10階・5階の待機所にて、管理室より追加通達を下達する。最新の通達は過去の規程を上書きする。常に最新の通達に従って処理しろ。
                    </span>
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-red-950 block mb-0.5 font-bold">
                      【第三条：車内保安と運行停止基準】
                    </strong>
                    <span className="text-stone-800">
                      下降中の有毒瘴気は「急速換気」、背後に映る怪異は「非常ベル（防衛レーザー照射）」で排除しろ。精神安定度が尽きるか、苦情通報が3回累積した時点で運行資格を剥奪し、即刻運行を停止する。
                    </span>
                  </div>
                </div>

                <button
                  id="start-game-btn"
                  type="button"
                  onPointerDown={() => soundManager.resumeAudio()}
                  onClick={startGame}
                  className="w-full py-3 sm:py-3.5 px-4 sm:px-6 bg-stone-900 hover:bg-stone-800 border-2 border-amber-600/80 text-amber-400 font-mincho font-black tracking-widest text-xs sm:text-base rounded-xs shadow-[0_6px_20px_rgba(0,0,0,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>【業務開始】15階 検問待機所へ入る（{formatShiftCode(shiftCount)}）</span>
                </button>

                {/* 目立たない控えめな配属データ初期化導線 */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mincho text-stone-700">
                  <span className="text-stone-600">
                    ※配属シフト記録は本端末に自動保存されます
                  </span>
                  <button
                    id="reset-shift-btn"
                    type="button"
                    onClick={handleResetShiftData}
                    disabled={shiftCount <= 1 && !shiftResetFeedback}
                    className={`px-2 py-0.5 border rounded-xs text-[10px] sm:text-[11px] font-bold transition-colors whitespace-nowrap ${
                      shiftResetFeedback
                        ? 'border-emerald-700 bg-emerald-950/15 text-emerald-900 cursor-default'
                        : shiftCount > 1
                        ? 'border-stone-700/80 bg-stone-900/10 hover:bg-stone-900/20 text-stone-900 cursor-pointer'
                        : 'border-stone-500/40 text-stone-500/70 cursor-default'
                    }`}
                  >
                    {shiftResetFeedback
                      ? STORY_TEXTS.title.resetDoneLabel
                      : STORY_TEXTS.title.resetButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div
            id="gameover-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
          >
            <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y bg-stone-950 border-2 border-red-700 rounded-xs p-4 sm:p-6 shadow-[0_0_80px_rgba(220,38,38,0.75)] font-mincho my-auto shrink-0">
              <div className="flex items-center justify-between border-b-2 border-red-900 pb-3 mb-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-red-400 tracking-widest block">
                    管理室 保安統制課 // 運行停止記録（{formatShiftCode(shiftCount)}）
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-red-100 mt-0.5">
                    昇降機 強制停止・資格剥奪
                  </h2>
                </div>
                <div className="border-2 border-red-500 text-red-400 font-extrabold text-xs px-2 py-1 rotate-[-5deg] shrink-0">
                  停止済
                </div>
              </div>

              <div className="flex justify-center my-3">
                <Skull className="w-12 h-12 text-red-500 animate-pulse" />
              </div>

              <div className="bg-red-950/50 border-2 border-red-800 p-4 rounded-xs text-sm text-red-100 mb-6 leading-relaxed text-left">
                <div className="text-xs font-bold text-red-400 mb-1.5 flex items-center gap-1.5 border-b border-red-900/80 pb-1">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>
                    【停止通知】第十五號昇降機（最終地点：{floor <= 0 ? 'B1F' : `${floor}階`}）
                  </span>
                </div>
                {gameOverReason}
              </div>

              <button
                id="retry-game-btn"
                type="button"
                onClick={startGame}
                className="w-full py-3 px-6 bg-red-800 hover:bg-red-700 border border-red-500 text-stone-100 font-bold tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>【再配置】15階から検問をやり直す</span>
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'CLEAR' && (
          <motion.div
            id="clear-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y ${
              endingType === 'TRUE' ? 'bg-[#02050d]/95' : 'bg-black/96'
            }`}
          >
            {endingType === 'TRUE' ? (
              /* ★ ② TRUE END：地下B1F搬入口突破・深夜の街へ完全脱出リザルト画面 */
              <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y bg-slate-950/95 border-2 border-slate-600/80 p-2 sm:p-3 shadow-[0_0_90px_rgba(30,58,138,0.65)] my-auto shrink-0">
                <div className="border border-slate-700 p-4 sm:p-6 text-slate-100 font-mincho bg-gradient-to-b from-slate-950 via-[#070d1b] to-stone-950">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4 gap-2">
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-sky-400/90 tracking-widest block">
                        {STORY_TEXTS.trueEndResult.headerLabel}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-0.5">
                        {STORY_TEXTS.trueEndResult.title}
                      </h2>
                    </div>
                    <div className="border-2 border-sky-500/80 text-sky-300 font-extrabold text-xs px-2.5 py-1 rotate-[-5deg] shrink-0 bg-sky-950/50">
                      {STORY_TEXTS.trueEndResult.stampText}
                    </div>
                  </div>

                  <div className="flex justify-center my-2.5">
                    <Wind className="w-11 h-11 text-sky-300/85 animate-pulse" />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 font-bold mb-4 leading-relaxed text-left">
                    {STORY_TEXTS.trueEndResult.description}
                  </p>

                  <div className="grid grid-cols-3 divide-x divide-slate-800 border border-slate-700 bg-black/50 mb-5 text-center text-xs">
                    <div className="p-2 sm:p-2.5">
                      <span className="text-slate-400 font-bold block text-[10px]">
                        脱出地点
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-sky-300">
                        B1F 夜の街
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-slate-400 font-bold block text-[10px]">
                        残存精神力
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-300">
                        {sanity} / {MAX_SANITY}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-slate-400 font-bold block text-[10px]">
                        脱出シフト
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-amber-300 font-seven-seg">
                        {formatShiftCode(shiftCount)}
                      </span>
                    </div>
                  </div>

                  <button
                    id="play-again-btn"
                    type="button"
                    onClick={startGame}
                    className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 border-2 border-sky-500/80 text-sky-200 font-black tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{STORY_TEXTS.trueEndResult.playAgainButton}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ★ ① NORMAL END：管理室公式公文書「第十五號昇降機 検閲業務評価表」（ネタバレ・ヒント撤廃／次シフト再配属） */
              <div
                id="normal-evaluation-sheet"
                className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y metal-panel-surface border-2 border-stone-700 p-2 sm:p-3 shadow-[0_0_80px_rgba(0,0,0,0.92)] my-auto shrink-0"
              >
                <div className="aged-paper border-2 border-stone-900 p-4 sm:p-6 text-stone-900 font-mincho">
                  {/* 文書ヘッダー・監査印 */}
                  <div className="flex items-start justify-between border-b-2 border-stone-900 pb-3 mb-3 gap-2">
                    <div className="text-left">
                      <span className="text-[11px] font-extrabold text-stone-700 tracking-widest block">
                        {STORY_TEXTS.evaluationSheet.issuerLabel}
                      </span>
                      <h2 className="text-lg sm:text-2xl font-extrabold text-stone-950 mt-0.5 tracking-wider">
                        {STORY_TEXTS.evaluationSheet.documentTitle}
                      </h2>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-stone-900 text-amber-400 font-seven-seg text-xs tracking-widest rounded-xs">
                        記録対象：{formatShiftCode(shiftCount)}
                      </span>
                    </div>
                    <div className="border-2 border-red-900 text-red-900 font-extrabold text-xs px-2.5 py-1 rotate-[-5deg] shrink-0">
                      {STORY_TEXTS.evaluationSheet.stampText}
                    </div>
                  </div>

                  {/* 総合評価ランク欄 */}
                  <div className="flex items-center justify-between gap-3 border-2 border-stone-800 bg-stone-900/10 p-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldCheck className="w-7 h-7 text-stone-900 shrink-0" />
                      <div className="text-left min-w-0">
                        <span className="text-[10px] font-bold text-stone-700 block tracking-widest">
                          総合評価判定区分
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-stone-950 block truncate">
                          {evaluationResult.classification}
                        </span>
                      </div>
                    </div>
                    <div
                      id="evaluation-rank-badge"
                      className={`w-12 h-12 sm:w-14 sm:h-14 border-2 flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 ${
                        evaluationResult.rank === 'S'
                          ? 'border-red-900 bg-red-950 text-amber-300'
                          : evaluationResult.rank === 'A'
                          ? 'border-stone-900 bg-stone-900 text-stone-100'
                          : evaluationResult.rank === 'B'
                          ? 'border-stone-800 bg-stone-700 text-stone-100'
                          : 'border-red-900 bg-red-900/20 text-red-950'
                      }`}
                    >
                      {evaluationResult.rank}
                    </div>
                  </div>

                  {/* 実績内訳テーブル */}
                  <div className="border-2 border-stone-800 divide-y divide-stone-700/70 bg-white/35 text-xs mb-3 text-left">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-bold text-stone-800">
                        検閲処理数（収容 {boardedSafeCount}名 ／ 遮断 {repelledThreatCount}体）
                      </span>
                      <span className="font-extrabold text-stone-950">
                        計 {evaluationResult.processedTotal} 件
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-bold text-stone-800">残存精神安定度</span>
                      <span className="font-extrabold text-stone-950">
                        {sanity} / {MAX_SANITY}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-bold text-stone-800">住人苦情累積数</span>
                      <span className="font-extrabold text-red-950">
                        {complaints} / {MAX_COMPLAINTS}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-bold text-stone-800">最終到達・処理工程</span>
                      <span className="font-extrabold text-stone-950">
                        01F到達 → 15F転送済
                      </span>
                    </div>
                  </div>

                  {/* 管理室冷徹評価コメント＆再配属命令（メタヒントなし） */}
                  <div className="border border-stone-800 bg-stone-900/5 p-3 mb-3 text-left space-y-1.5">
                    <p className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed">
                      {evaluationResult.verdict}
                    </p>
                    <p className="text-xs font-extrabold text-red-950 border-t border-stone-700/60 pt-1.5 leading-relaxed">
                      {STORY_TEXTS.evaluationSheet.coldDirectiveQuote}
                    </p>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-stone-700 font-bold mb-4 text-left leading-snug">
                    {STORY_TEXTS.evaluationSheet.auditFootnote}
                  </p>

                  <button
                    id="reassign-next-shift-btn"
                    type="button"
                    onClick={handleReassignNextShift}
                    className="w-full py-3 px-6 bg-stone-900 hover:bg-stone-800 border-2 border-red-800/80 text-amber-400 font-black tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {STORY_TEXTS.evaluationSheet.reassignButtonLabel(
                        shiftCount + 1
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {isPaused && (
          <motion.div
            id="pause-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/92 flex flex-col items-center justify-start p-2 sm:p-4 select-none overflow-y-auto overscroll-contain touch-pan-y"
          >
            <div className="max-w-md w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y metal-panel-surface border-2 border-stone-600 rounded-xs p-4 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.98)] text-center font-mincho relative my-auto shrink-0">
              <div className="flex items-center justify-between border-b border-stone-700 pb-2 mb-4">
                <span className="text-xs font-bold text-amber-500 tracking-widest">
                  【業務中断】管理室監視一時保留
                </span>
                <span className="text-xs font-bold text-stone-400">
                  現在地：{floor <= 0 ? 'B1F' : `${floor}階`}
                </span>
              </div>

              <Pause className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-pulse" />
              <h2 className="text-xl font-extrabold text-stone-100 mb-2 tracking-wider">
                昇降機 一時停止中
              </h2>
              <p className="text-xs text-stone-300 mb-6 leading-relaxed">
                『現在、昇降機は一時停止状態にある。<br />
                準備ができ次第、下のボタンより検問業務へ復帰しろ。』
              </p>

              <button
                id="resume-game-btn"
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3 px-6 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black tracking-widest rounded-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>【業務再開】検問シフトへ復帰する</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;


