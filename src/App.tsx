import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ActivePassenger,
  EndingType,
  EventOutcome,
  GameState,
  MovingCabinEvent,
  NoticeRule,
  ToastAlert,
  VisitorData,
} from './types/game';
import {
  CORRUPTED_MEMO,
  INITIAL_NOTICE_RULES,
  selectVisitorForFloor,
} from './data/initialData';
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
  Sun,
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

// 約1.8秒（1800ms / 50ms = 36ティック）で 12% → 100%（+88%）に到達する増分
const OPEN_HOLD_STEP_PER_50MS = 88 / 36;
// 最終フロア（1F / B1F）で重々しい扉を 0% → 100% まで約3.75秒（75ティック）かけてじわじわ開ける増分
const FINAL_DOOR_OPEN_STEP_PER_50MS = 100 / 75;
// こじ開け怪異が放置された際、約6.0秒（6000ms / 50ms = 120ティック）で 12% → 100%（+88%）まで強制開扉する増分
const PRYING_OPEN_STEP_PER_50MS = 88 / 120;

export function App() {
  // コアゲーム状態
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [floor, setFloor] = useState<number>(15);
  const [sanity, setSanity] = useState<number>(MAX_SANITY);
  const [complaints, setComplaints] = useState<number>(0);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [endingType, setEndingType] = useState<EndingType>('NORMAL');
  const [endingOverlayFade, setEndingOverlayFade] = useState<'NONE' | 'BLACKOUT' | 'WHITEOUT'>('NONE');

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
  const trueEndUnlockedRef = useRef<boolean>(false);
  const floorRef = useRef<number>(15);

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
      soundManager.stopCabinRattle();
      soundManager.stopMotorDrone();
      soundManager.stopDoorMotor();
      soundManager.stopRapidVentilation();
      soundManager.stopMiasmaHeartbeat();
      soundManager.stopAnomalyPresence();
      soundManager.stopPryingLoop();
      if (gameState === 'TITLE' || gameState === 'GAMEOVER') {
        soundManager.stopMorningAmbience();
      }
    }
  }, [gameState]);

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
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(
      nextMuted,
      gameState !== 'TITLE' && gameState !== 'GAMEOVER' && gameState !== 'CLEAR'
    );
  };

  // 一時停止（ポーズ）切替
  const handleTogglePause = useCallback(() => {
    if (gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR') return;
    const nextPaused = !isPausedRef.current;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
    if (nextPaused) {
      soundManager.pauseAudio();
    } else {
      soundManager.resumeAudio();
    }
  }, [gameState]);

  // 張り紙・紙片を既読にする
  const handleMarkRuleRead = useCallback((id: string) => {
    setReadRuleIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
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

  const handleOpenMemo = useCallback(() => {
    handleMarkRuleRead(CORRUPTED_MEMO.id);
    setInspectModalState({ type: 'MEMO' });
  }, [handleMarkRuleRead]);

  const handleCloseModal = useCallback(() => {
    setInspectModalState(null);
  }, []);

  // ゲーム開始・リトライ初期化（15FのPREPAREフェーズから開始・全フラグ完全リセット）
  const startGame = () => {
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
    isPausedRef.current = false;
    setIsPaused(false);

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
      '『【15F 待機所】保安通達（3通）をすべて確認しろ。確認完了後、「▼ 下降開始」を押して業務を開始しろ。』'
    );
    setGameState('PREPARE');
  };

  // PREPARE（15F・10F・5F）から下降を開始/再開する
  const handleStartDescent = () => {
    if (gameState !== 'PREPARE') return;
    if (scrapToastTimerRef.current) {
      window.clearTimeout(scrapToastTimerRef.current);
      scrapToastTimerRef.current = null;
    }
    soundManager.playButtonClick('SWITCH');
    soundManager.playDoorLatchShut();
    setGameState('MOVING');
  };

  // JUDGING中の決定処理（乗車許可 / 閉め出し拒否 / 時間切れ強制乗車）
  const resolveJudgingDecision = useCallback(
    (decision: 'BOARD' | 'REJECT' | 'TIMEOUT_BOARD') => {
      if (decisionLockedRef.current || !currentVisitor) return;
      decisionLockedRef.current = true;
      isHoldingOpenRef.current = false;
      setIsHoldingOpen(false);
      // 検問決定の瞬間、2F用の特級危険物警報フラグを即座に消去する
      setIsKeyWomanAlertActive(false);

      soundManager.stopDoorMotor();
      soundManager.stopPryingLoop();
      soundManager.stopAnomalyPresence();

      const visitor = currentVisitor;
      let nextSanity = sanityRef.current;
      let nextComplaints = complaintsRef.current;
      let outcome: EventOutcome;

      // ★ 2階（2F）固定クライマックスイベント：「鍵となる彼女」の特別分岐
      if (visitor.isKeyWoman) {
        if (decision === 'BOARD' || decision === 'TIMEOUT_BOARD') {
          // 警告を無視して100%まで開けて招き入れた場合：ダメージ・クレームなしで第2の試練へ進む
          doorPercentRef.current = 100;
          setDoorOpenPercent(100);
          soundManager.playDoorSlide(0.4, true);
          soundManager.playDoorBumperStop();
          soundManager.playComplaintBuzzer();
          setScreenShake('VIOLENT');

          setBoardedSafeCount((prev) => prev + 1);
          const newPassenger: ActivePassenger = {
            visitor,
            boardedFloor: floor,
            remainingFloors: 99,
            requestFulfilled: true,
          };
          setActivePassengers((prev) => {
            const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
            return [...trimmed, newPassenger];
          });

          outcome = {
            type: 'SAFE_BOARDED',
            title: '【命令違反確認】2F対象を収容',
            detail: '管理室緊急通達：防衛システム起動準備',
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(
            '「……ありがとう。でも気をつけて、管理室が嘘の警報で私を消そうとしてくるわ！」『重大な命令違反を確認した。直ちに対象を遮断しろ。』'
          );
          showToast(
            'DANGER',
            '【管理室警告】重大命令違反',
            '『重大な命令違反を確認した。直ちに対象を排除しろ。』',
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
            title: '【管理室命令完遂】2F 特級対象を遮断',
            detail: '管理室評価：命令服従を確認（1Fへ進行）',
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(
            '「……そう。あなたも、あいつらの飼い犬になるのね……」『指示通りの処置だ。そのまま1階へ降下しろ。』'
          );
          showToast(
            'INFO',
            '【管理室通達】命令服従を確認',
            '『指示通りの処置だ。そのまま1階へ降下しろ。』',
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
            boardedFloor: floor,
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
            detail: `${floor}Fより収容（残${stayFloors}階で退出）`,
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
            detail: `${floor}F 通過完了`,
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
    [currentVisitor, floor, showToast]
  );

  // 下降完了後に次の階へ到着させる共通遷移処理（同乗者の自動降車・1F/B1F最終フロア分岐を含む）
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

      // ★ 最終フロア（1F または 地下B1F突入）への到達処理
      if (nextFloor <= 1) {
        setCurrentVisitor(null);
        setEventOutcome(null);
        isHoldingOpenRef.current = false;
        setIsHoldingOpen(false);
        doorPercentRef.current = 0;
        setDoorOpenPercent(0);

        if (trueEndUnlockedRef.current) {
          // ② トゥルーエンディングルート：1Fで止まらずに通過し、火花と激しい振動と共にB1Fへ突入！
          setEndingType('TRUE');
          floorRef.current = 1;
          setFloor(1);
          soundManager.playB1FBreakthrough();
          setScreenShake('VIOLENT');
          setJumpscareFlash(true);
          window.setTimeout(() => setJumpscareFlash(false), 260);
          setActiveSubtitle(
            '『待て！なぜ1階で止まらない！？システム異常だ、止まれ！！』'
          );
          showToast(
            'DANGER',
            '【管理室恐慌】1F 制動不能・地下区域へ突入！！',
            '『待て！なぜ1階で止まらない！？システム異常だ、止まれ！！』',
            2600
          );

          if (b1fTransitionTimerRef.current) {
            window.clearTimeout(b1fTransitionTimerRef.current);
          }
          b1fTransitionTimerRef.current = window.setTimeout(() => {
            b1fTransitionTimerRef.current = null;
            floorRef.current = 0;
            setFloor(0); // 0 = B1F
            soundManager.playArrivalChime(false);
            setIsArrivingFlash(true);
            if (arrivingFlashTimeoutRef.current) {
              window.clearTimeout(arrivingFlashTimeoutRef.current);
            }
            arrivingFlashTimeoutRef.current = window.setTimeout(
              () => setIsArrivingFlash(false),
              ARRIVING_FLASH_MS
            );
            setScreenShake('SUBTLE');
            decisionLockedRef.current = false;
            setActiveSubtitle(
              '『そこは封鎖したはずだ！開けるな！開けるなぁぁぁ！！』「…着いたわ、ここが本当の非常口よ！【開扉】を長押しして扉を最後まで開けて！」'
            );
            showToast(
              'DANGER',
              '【管理室緊急通信】B1F 封鎖区域到達',
              '『そこは封鎖したはずだ！開けるな！開けるなぁぁぁ！！』',
              4500
            );
            setGameState('FINAL_DOOR');
          }, 2300);
          return;
        }

        // ① 通常エンディングルート：1Fに到着し、FINAL_DOOR（手動開扉フェーズ）へ移行
        setEndingType('NORMAL');
        floorRef.current = 1;
        setFloor(1);
        setActivePassengers([]);
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
        decisionLockedRef.current = false;
        setActiveSubtitle(
          '『【1F 到達】1階ロビーに到着した。操作盤の「＜＞ 開扉」ボタンを長押しして扉を100%まで開けろ。』'
        );
        showToast(
          'INFO',
          '【管理室通達】1F 到達確認',
          '『1階に到着した。操作盤の【開扉】を長押しして扉を開けろ。』',
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

      // 10F・5Fは中間チェックポイント（10F: 公式通達2通 / 5F: 公式通達1通 ＋ 独立して血の紙片が隙間から滑り込む）
      if (nextFloor === 10 || nextFloor === 5) {
        soundManager.playCheckpointNotice();
        setCurrentVisitor(null);
        setEventOutcome(null);
        setScreenShake('NONE');

        if (nextFloor === 10) {
          showToast(
            'INFO',
            '【管理室通達】10F 停止中',
            '『規程改定の追加通達（2通）を下達した。内容を確認し、下降を再開しろ。』'
          );
          setActiveSubtitle(
            '『【10F 待機所】追加通達（2通）を下達した。確認完了後、「▼ 下降再開」を押せ。』'
          );
        } else {
          showToast(
            'INFO',
            '【管理室通達】5F 停止中',
            '『低層階の追加通達（1通）を下達した。確認完了後、下降を再開しろ。』',
            2600
          );
          setActiveSubtitle(
            '『【5F 待機所】低層階の追加通達（1通）を確認しろ。確認後、「▼ 下降再開」を押して業務を続行しろ。』'
          );
          // 管理室アナウンスとは独立して、扉の隙間から血に汚れた紙片が滑り込んでくる通知を出す
          if (scrapToastTimerRef.current) {
            window.clearTimeout(scrapToastTimerRef.current);
          }
          scrapToastTimerRef.current = window.setTimeout(() => {
            showToast(
              'DANGER',
              '【扉の隙間】何かが滑り込んできた',
              'エレベーターの扉の隙間から、血に汚れた紙片が滑り込んできた……',
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
      setCurrentVisitor(nextVisitor);
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
        promptText:
          '『背後に特級危険物を検知した。直ちに【非常ベル】を押して防衛レーザーを作動させろ。繰り返す、直ちに照射しろ。』',
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

        soundManager.playElevatorJolt();
        setScreenShake('VIOLENT');
        window.setTimeout(() => {
          setScreenShake('SUBTLE');
        }, 320);

        if (scheduledEvent.type === 'MIASMA') {
          soundManager.startMiasmaHeartbeat();
        } else if (scheduledEvent.type === 'MIRROR_GHOST') {
          soundManager.playMirrorGhostAppear();
          if (scheduledEvent.isKeyWomanTrial) {
            soundManager.playComplaintBuzzer();
            showToast(
              'DANGER',
              '【管理室 緊急命令】非常ベルを押せ',
              '『背後に特級危険物を検知した。直ちに【非常ベル】を押して防衛レーザーを作動させろ。』',
              3600
            );
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

            // ★ 2F→1F「鍵となる彼女」第2の試練：3.5秒間、非常ベルを押さずに最後まで耐え抜いた場合（トゥルーエンド条件達成！）
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

              setActiveSubtitle(
                '「…信じてくれたのね。1階の偽装ロックを解除するわ。しっかり掴まっていて！」'
              );
              showToast(
                'INFO',
                '【1F偽装ロック解除】彼女を信じ抜いた',
                '警報ノイズが止み、1階の偽装ロックが解除されました。',
                3400
              );

              let trueWaitRemaining = 3200;
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

          // ★ 2階（2F）の「鍵となる彼女」出現時：管理室からの猛烈な赤色点滅＆警報ブザー命令
          if (currentVisitor.isKeyWoman) {
            setIsKeyWomanAlertActive(true);
            soundManager.playComplaintBuzzer();
            setScreenShake('VIOLENT');
            setTimeout(() => setScreenShake('SUBTLE'), 360);
            showToast(
              'DANGER',
              '【最優先命令】2階の個体は特級危険物である',
              '『絶対に開けるな。直ちに扉を閉めろ。命令違反は許されない。』',
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

  // 5. FINAL_DOOR フェーズ（最終フロア 1F / B1F にて、時間制限なしで重い扉を手動長押しで0%→100%まで開ける）
  useEffect(() => {
    if (gameState !== 'FINAL_DOOR') return;

    setIsKeyWomanAlertActive(false);

    let rewindTimer: number | null = null;
    let sequenceTimeout1: number | null = null;
    let sequenceTimeout2: number | null = null;
    let latchTimeout: number | null = null;

    const intervalMs = 50;
    const timer = window.setInterval(() => {
      if (decisionLockedRef.current || isPausedRef.current) return;

      if (isHoldingOpenRef.current) {
        const nextDoor = Math.min(
          100,
          doorPercentRef.current + FINAL_DOOR_OPEN_STEP_PER_50MS
        );
        doorPercentRef.current = nextDoor;
        setDoorOpenPercent(nextDoor);

        // 100%まで開ききった瞬間のマルチエンディング結末演出！
        if (nextDoor >= 100) {
          decisionLockedRef.current = true;
          isHoldingOpenRef.current = false;
          setIsHoldingOpen(false);
          soundManager.stopDoorMotor();
          soundManager.playDoorBumperStop();

          if (trueEndUnlockedRef.current || floorRef.current <= 0) {
            // ② トゥルーエンディング（B1F）：管理室のシステムが「バチィッ！」とショートして沈黙し、朝の風と鳥のさえずりが響く
            soundManager.playSystemShortCircuitExplosion();
            soundManager.stopCabinRattle();
            soundManager.stopMotorDrone();
            soundManager.stopAnomalyPresence();
            setScreenShake('NONE');
            soundManager.startMorningAmbience();

            setActivePassengers([]);
            setActiveSubtitle('「ありがとう、これで私たちは自由よ」');
            showToast(
              'INFO',
              '【管理室通信途絶】監視システム完全破壊',
              'バチィッ！――管理室のスピーカーが火花を散らして沈黙し、外から朝の爽やかな風が吹き抜けた。',
              4000
            );

            sequenceTimeout1 = window.setTimeout(() => {
              setEndingOverlayFade('WHITEOUT');
              sequenceTimeout2 = window.setTimeout(() => {
                setEndingOverlayFade('NONE');
                setGameState('CLEAR');
              }, 1450);
            }, 2800);
          } else {
            // ① 通常エンディング（1F）：同じエレベーターの箱が合わせ鏡のように並び、1F→15Fへ猛スピードで巻き戻される
            soundManager.playComplaintBuzzer();
            setActiveSubtitle(
              '『1階到達を確認。本日の検問業務を完了とする。……引き続き、第2シフトを開始しろ。』'
            );
            showToast(
              'DANGER',
              '【管理室命令】第2シフト強制開始',
              '『1階到達を確認。引き続き、第2シフトを開始しろ。』',
              4200
            );

            sequenceTimeout1 = window.setTimeout(() => {
              // 扉が強制的に閉まり、1F → 2F → ... → 15F へと猛スピードで巻き戻される
              soundManager.playDoorSlide(0.35, false);
              doorPercentRef.current = 0;
              setDoorOpenPercent(0);
              latchTimeout = window.setTimeout(() => soundManager.playDoorLatchShut(), 260);
              soundManager.startMotorDrone();
              setScreenShake('VIOLENT');

              let rewindFloor = 1;
              rewindTimer = window.setInterval(() => {
                rewindFloor += 1;
                floorRef.current = rewindFloor;
                setFloor(rewindFloor);
                soundManager.playFloorRewindTick(rewindFloor);

                if (rewindFloor >= 15) {
                  if (rewindTimer) {
                    window.clearInterval(rewindTimer);
                    rewindTimer = null;
                  }
                  setEndingOverlayFade('BLACKOUT');
                  sequenceTimeout2 = window.setTimeout(() => {
                    soundManager.stopMotorDrone();
                    setScreenShake('NONE');
                    setEndingOverlayFade('NONE');
                    setGameState('CLEAR');
                  }, 1200);
                }
              }, 125);
            }, 2400);
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
      if (rewindTimer) window.clearInterval(rewindTimer);
      if (sequenceTimeout1) window.clearTimeout(sequenceTimeout1);
      if (sequenceTimeout2) window.clearTimeout(sequenceTimeout2);
      if (latchTimeout) window.clearTimeout(latchTimeout);
      soundManager.stopDoorMotor();
    };
  }, [gameState, showToast]);

  // 操作盤ハンドラ：開（OPEN）長押し開始・終了
  const handleStartHoldOpen = () => {
    if (
      isPausedRef.current ||
      (gameState !== 'JUDGING' && gameState !== 'FINAL_DOOR') ||
      decisionLockedRef.current
    ) {
      return;
    }
    if (!isHoldingOpenRef.current) {
      soundManager.playButtonClick('OPEN');
      soundManager.startDoorMotor('OPEN');
    }
    isHoldingOpenRef.current = true;
    setIsHoldingOpen(true);
  };

  const handleStopHoldOpen = () => {
    if (!isHoldingOpenRef.current) return;
    isHoldingOpenRef.current = false;
    setIsHoldingOpen(false);
    soundManager.stopDoorMotor();
    if (
      (gameState === 'JUDGING' && !decisionLockedRef.current && doorPercentRef.current > 12) ||
      (gameState === 'FINAL_DOOR' && !decisionLockedRef.current && doorPercentRef.current > 0)
    ) {
      soundManager.playDoorSlide(0.35, false);
    }
  };

  // 操作盤ハンドラ：閉（CLOSE）押下
  const handlePressClose = () => {
    if (isPausedRef.current) return;
    soundManager.playButtonClick('CLOSE');

    // 検問フェーズ（JUDGING）中の閉め出し操作
    if (gameState !== 'JUDGING' || decisionLockedRef.current) return;

    const nextRemaining = closeClicksRemaining - 1;
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
  };

  // 操作盤ハンドラ：急速換気（FAN）ボタン（押すと3秒間だけ作動して自動停止＋空撃ちペナルティ）
  const handleToggleFan = () => {
    if (isPausedRef.current || isFanOn) return; // ポーズ中または既に稼働中なら無視

    soundManager.playButtonClick('SWITCH');
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
        setIsFanOn(false);
        if (fanTimerRef.current) {
          window.clearInterval(fanTimerRef.current);
          fanTimerRef.current = null;
        }
      }
    }, 50);

    const currentEv = movingEventRef.current;

    // 1. 下降中の「瘴気（MIASMA）」イベントへの対処
    if (
      gameState === 'MOVING' &&
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
      setActivePassengers((prev) =>
        prev.map((p) =>
          p.visitor.id === targetPassenger.visitor.id
            ? { ...p, requestFulfilled: true }
            : p
        )
      );
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

      if (nextComplaints >= MAX_COMPLAINTS && gameState !== 'EVENT_RESULT') {
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
  };

  // 操作盤ハンドラ：非常ベル押下（車内怪異の緊急排除 ＆ 2F「鍵となる彼女」第2の試練の分岐 ＆ 扉こじ開け怪異の威嚇）
  const handlePressBell = () => {
    if (isPausedRef.current) return;
    soundManager.playEmergencyBell();
    setScreenShake('VIOLENT');
    setTimeout(() => setScreenShake('NONE'), 320);

    const currentEv = movingEventRef.current;

    // 1. 下降中の「鏡面反射（MIRROR_GHOST）」へのレーザー照射
    if (
      gameState === 'MOVING' &&
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

      // ★ 2F→1F「鍵となる彼女」の第2の試練で非常ベルを押してしまった場合：彼女が消滅し、通常エンド（1F）へ進む
      if (currentEv.isKeyWomanTrial) {
        trueEndUnlockedRef.current = false;
        setEndingType('NORMAL');
        setActiveSubtitle(
          '「…やっぱり、あいつらを信じるのね…」『特級対象の焼却完了を確認した。そのまま1階へ降下しろ。』'
        );
        showToast(
          'INFO',
          '【管理室通達】特級対象を排除',
          '『対象の排除を確認した。そのまま1階へ降下しろ。』',
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
      gameState === 'JUDGING' &&
      currentVisitor &&
      currentVisitor.isThreat &&
      closeClicksRemaining > 1
    ) {
      setCloseClicksRemaining(1);
      soundManager.stopPryingLoop();
      setActiveSubtitle(
        '『【防衛レーザー威嚇】アーク閃光により対象が怯んだ。直ちに【閉扉】を押して扉を閉め切れ。』'
      );
    }
  };

  const isSlowMotionActive = gameState === 'JUDGING' && isInspectingModalOpen;
  const unlockedRules = INITIAL_NOTICE_RULES.filter((r) => floor <= r.unlockedAtFloor);

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
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between metal-wall select-none touch-manipulation"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
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

      {/* 1. 最上部：階層インジケーター＆精神安定度＆通報累積ヘッダー */}
      <FloorIndicator
        floor={floor}
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
      />

      {/* 2. メインエリア：PCは3カラム（左:通達 中:扉 右:操作盤）、スマホ縦画面は扉が大きく中央に表示 */}
      <main className="relative z-20 flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
        {/* デスクトップ左側パネル：張り紙一覧 */}
        <div className="hidden md:block md:col-span-3 h-full overflow-hidden">
          <NoticeBoard
            rules={INITIAL_NOTICE_RULES}
            corruptedMemo={CORRUPTED_MEMO}
            currentFloor={floor}
            readRuleIds={readRuleIds}
            onOpenRule={handleOpenRule}
            onOpenManual={handleOpenManual}
            onOpenMemo={handleOpenMemo}
          />
        </div>

        {/* 中央メイン：エレベーターの両開き金属扉（端末の画面高に合わせて自動伸縮） */}
        <div className="flex-1 min-h-0 md:col-span-6 h-full overflow-hidden relative">
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
            onOpenMemo={handleOpenMemo}
          />
        </div>

        {/* デスクトップ右側パネル：スリム操作盤 */}
        <div className="hidden md:block md:col-span-3 h-full overflow-hidden">
          <ControlPanel
            floor={floor}
            gameState={gameState}
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
      />

      {/* 4. モバイル縦画面専用：最下部 親指操作コントロールエリア（左:文書ボタン群 / 右:扉・設備操作盤） */}
      <section
        aria-label="モバイル操作パネル"
        className="relative z-30 md:hidden shrink-0 grid grid-cols-12 gap-1.5 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] metal-panel-surface border-t border-stone-800"
      >
        <div className="col-span-4 min-w-0">
          <MobileDocButtons
            rules={INITIAL_NOTICE_RULES}
            corruptedMemo={CORRUPTED_MEMO}
            currentFloor={floor}
            readRuleIds={readRuleIds}
            onOpenRuleList={handleOpenRuleList}
            onOpenManual={handleOpenManual}
            onOpenMemo={handleOpenMemo}
          />
        </div>
        <div className="col-span-8 min-w-0">
          <ControlPanel
            floor={floor}
            gameState={gameState}
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
          />
        </div>
      </section>

      {/* 共通モーダル：保安通達一覧・詳細 ／ 運行手引書 ／ 血塗れの紙片 */}
      <NoticeModals
        modalState={inspectModalState}
        unlockedRules={unlockedRules}
        corruptedMemo={CORRUPTED_MEMO}
        readRuleIds={readRuleIds}
        gameState={gameState}
        judgingTimeLeftMs={judgingTimeLeftMs}
        onSelectRule={handleOpenRule}
        onClose={handleCloseModal}
      />

      {/* エンディング遷移時の暗転（BLACKOUT）／ホワイトアウト（WHITEOUT）オーバーレイ */}
      <AnimatePresence>
        {endingOverlayFade !== 'NONE' && (
          <motion.div
            id="ending-fade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: 'easeInOut' }}
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
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
          >
            {/* 公文書・業務辞令書風の重厚なUI */}
            <div className="max-w-xl w-full max-h-[92dvh] flex flex-col metal-panel-surface border-2 border-stone-700 p-2 sm:p-3.5 shadow-[0_25px_70px_rgba(0,0,0,0.98)] relative my-auto shrink-0">
              <div className="aged-paper border-2 border-stone-800 p-3.5 sm:p-6 text-stone-900 font-mincho relative shadow-inner overflow-y-auto overscroll-contain touch-pan-y min-h-0 flex-1">
                {/* 上部：文書番号・朱印 */}
                <div className="flex items-start justify-between border-b-2 border-stone-800 pb-2.5 mb-3 sm:mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-stone-700 tracking-widest block">
                      管理室 保安統制課 発令（機密第拾伍號）
                    </span>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-stone-950 tracking-wider mt-0.5">
                      第十五號昇降機
                    </h1>
                    <span className="text-xs font-extrabold text-red-900 tracking-widest block mt-0.5">
                      ― 夜間特別検問業務 辞令書 ―
                    </span>
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
                  <span>【業務開始】15階 検問待機所へ入る</span>
                </button>
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
            className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
          >
            <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y bg-stone-950 border-2 border-red-700 rounded-xs p-4 sm:p-6 shadow-[0_0_80px_rgba(220,38,38,0.75)] font-mincho my-auto shrink-0">
              <div className="flex items-center justify-between border-b-2 border-red-900 pb-3 mb-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-red-400 tracking-widest block">
                    管理室 保安統制課 // 運行停止記録
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
            className={`fixed inset-0 z-50 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y ${
              endingType === 'TRUE' ? 'bg-sky-950/80' : 'bg-black/94'
            }`}
          >
            {endingType === 'TRUE' ? (
              /* ★ ② TRUE END：地下B1F突破・完全脱出リザルト画面 */
              <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y bg-amber-50/95 border-2 border-sky-600 p-2 sm:p-3 shadow-[0_0_90px_rgba(56,189,248,0.65)] my-auto shrink-0">
                <div className="border-2 border-stone-800 p-4 sm:p-6 text-stone-900 font-mincho bg-linear-to-b from-sky-50 via-amber-50/70 to-stone-100">
                  <div className="flex items-center justify-between border-b-2 border-sky-900 pb-3 mb-4">
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-sky-800 tracking-widest block">
                        地下B1F 封鎖非常口突破 // 監視システム完全破壊
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 mt-0.5">
                        TRUE END：完全脱出
                      </h2>
                    </div>
                    <div className="border-2 border-sky-700 text-sky-800 font-extrabold text-xs px-2.5 py-1 rotate-[-5deg] shrink-0 bg-sky-100">
                      自由獲得
                    </div>
                  </div>

                  <div className="flex justify-center my-2">
                    <Sun className="w-12 h-12 text-amber-500 animate-spin" style={{ animationDuration: '18s' }} />
                  </div>

                  <p className="text-xs sm:text-sm text-stone-900 font-bold mb-4 leading-relaxed text-left">
                    管理室の嘘の警報と命令に屈せず、2階の「彼女」を最後まで信じ抜いたことで1階の偽装ロックは解除された。火花を散らして沈黙したエレベーターの向こうには、コンクリート階段の先に広がる眩い朝の青空と爽やかな風が待っていた。――あなたは永遠の飼育ループを打ち破り、ついに外の世界へと脱出した。
                  </p>

                  <div className="grid grid-cols-3 divide-x divide-stone-400 border-2 border-stone-800 bg-white/70 mb-5 text-center text-xs">
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">到達フロア</span>
                      <span className="text-lg font-extrabold text-sky-800">
                        B1F 非常口
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">残存精神力</span>
                      <span className="text-lg font-extrabold text-emerald-800">
                        {sanity} / {MAX_SANITY}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">遮断排除 / 収容</span>
                      <span className="text-lg font-extrabold text-stone-950">
                        {repelledThreatCount} / {boardedSafeCount}
                      </span>
                    </div>
                  </div>

                  <button
                    id="play-again-btn"
                    type="button"
                    onClick={startGame}
                    className="w-full py-3 px-6 bg-sky-900 hover:bg-sky-800 border-2 border-amber-400 text-amber-200 font-black tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>【最初から遊ぶ】もう一度15階からプレイする</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ★ ① NORMAL END：第十五號昇降機・無限勤務リザルト画面 */
              <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y metal-panel-surface border-2 border-red-900/80 p-2 sm:p-3 shadow-[0_0_80px_rgba(185,28,28,0.45)] my-auto shrink-0">
                <div className="aged-paper border-2 border-stone-900 p-4 sm:p-6 text-stone-900 font-mincho">
                  <div className="flex items-center justify-between border-b-2 border-stone-900 pb-3 mb-4">
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-red-900 tracking-widest block">
                        管理室 保安統制課 // 第2シフト強制発令
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-stone-950 mt-0.5">
                        NORMAL END：第十五號昇降機・無限勤務
                      </h2>
                    </div>
                    <div className="border-2 border-red-900 text-red-900 font-extrabold text-xs px-2.5 py-1 rotate-[-5deg] shrink-0">
                      永久継続
                    </div>
                  </div>

                  <div className="flex justify-center my-2">
                    <ShieldCheck className="w-11 h-11 text-stone-800" />
                  </div>

                  <p className="text-xs sm:text-sm text-stone-900 font-bold mb-3 leading-relaxed text-left">
                    1階で重苦しい扉を開けた先にあったのは外の出口ではなく、今自分が乗っているのと全く同じ薄暗い昇降機の箱だった。『1階到達を確認。本日の検問業務を完了とする。……引き続き、第2シフトを開始しろ。』――無情なアナウンスと共にインジケーターは15階へと巻き戻され、終わりのないループが再び始まる。
                  </p>
                  <div className="bg-red-950/10 border border-red-900/50 px-3 py-2 rounded-xs text-[11px] font-bold text-red-950 mb-4 text-left">
                    【ヒント】5階の扉の隙間から滑り込んできた「血に塗れた走り書き」を思い出し、2階で現れる“彼女”を信じて管理室の命令に逆らってみましょう。
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-stone-700 border-2 border-stone-800 bg-stone-900/5 mb-5 text-center text-xs">
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">残存精神力</span>
                      <span className="text-lg font-extrabold text-stone-900">
                        {sanity} / {MAX_SANITY}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">累積苦情通報</span>
                      <span className="text-lg font-extrabold text-amber-900">
                        {complaints} / {MAX_COMPLAINTS}
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <span className="text-stone-700 font-bold block text-[10px]">遮断排除 / 収容</span>
                      <span className="text-lg font-extrabold text-stone-950">
                        {repelledThreatCount} / {boardedSafeCount}
                      </span>
                    </div>
                  </div>

                  <button
                    id="play-again-btn"
                    type="button"
                    onClick={startGame}
                    className="w-full py-3 px-6 bg-stone-900 hover:bg-stone-800 border-2 border-red-700/80 text-amber-400 font-black tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>【第2シフト開始】15階から業務を再開する</span>
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
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 select-none overflow-y-auto overscroll-contain touch-pan-y"
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


