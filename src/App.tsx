import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ActivePassenger,
  EventOutcome,
  GameState,
  MovingCabinEvent,
  ToastAlert,
  VisitorData,
} from './types/game';
import {
  INITIAL_NOTICE_RULES,
  selectVisitorForFloor,
} from './data/initialData';
import { soundManager } from './utils/SoundManager';
import { FloorIndicator } from './components/FloorIndicator';
import { ElevatorDoor } from './components/ElevatorDoor';
import { NoticeBoard } from './components/NoticeBoard';
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
  Smartphone,
} from 'lucide-react';

const MAX_SANITY = 3;
const MAX_COMPLAINTS = 3;
const QUIET_MOVING_DURATION_MS = 2600;
const EVENT_MOVING_WINDOW_MS = 5200; // 下降中イベント発生時の対処猶予を長めに確保（5.2秒）
const ARRIVING_DURATION_MS = 1000;
const JUDGING_DURATION_MS = 8000; // 8.0秒ベース
const RESULT_DURATION_MS = 2200;
const RAPID_FAN_DURATION_MS = 3000; // 急速換気稼働時間（3.0秒）

// 約1.8秒（1800ms / 50ms = 36ティック）で 12% → 100%（+88%）に到達する増分
const OPEN_HOLD_STEP_PER_50MS = 88 / 36;

export function App() {
  // コアゲーム状態
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [floor, setFloor] = useState<number>(15);
  const [sanity, setSanity] = useState<number>(MAX_SANITY);
  const [complaints, setComplaints] = useState<number>(0);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  // 扉＆訪問者状態
  const [doorOpenPercent, setDoorOpenPercent] = useState<number>(0);
  const [isHoldingOpen, setIsHoldingOpen] = useState<boolean>(false);
  const [currentVisitor, setCurrentVisitor] = useState<VisitorData | null>(null);
  const [closeClicksRemaining, setCloseClicksRemaining] = useState<number>(1);
  const [judgingTimeLeftMs, setJudgingTimeLeftMs] = useState<number>(JUDGING_DURATION_MS);
  const [isPeekTransformed, setIsPeekTransformed] = useState<boolean>(false);

  // 張り紙既読管理 ＆ モーダル開放（0.25xスローモーション）状態
  const [readRuleIds, setReadRuleIds] = useState<string[]>([]);
  const [isInspectingModalOpen, setIsInspectingModalOpen] = useState<boolean>(false);

  // 同乗住人・車内設備・下降中イベント・トースト通知
  const [activePassengers, setActivePassengers] = useState<ActivePassenger[]>([]);
  const [boardedSafeCount, setBoardedSafeCount] = useState<number>(0);
  const [repelledThreatCount, setRepelledThreatCount] = useState<number>(0);
  const [isFanOn, setIsFanOn] = useState<boolean>(false);
  const [movingEvent, setMovingEvent] = useState<MovingCabinEvent | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>(
    '「【第十五號昇降機】夜間運行業務を開始してください。規程に反する存在を車内に招き入れてはなりません。」'
  );
  const [eventOutcome, setEventOutcome] = useState<EventOutcome | null>(null);
  const [toastAlert, setToastAlert] = useState<ToastAlert | null>(null);

  // 演出トリガー用（画面シェイク・赤フラッシュ）
  const [screenShake, setScreenShake] = useState<'NONE' | 'SUBTLE' | 'VIOLENT'>('NONE');
  const [jumpscareFlash, setJumpscareFlash] = useState<boolean>(false);

  // モバイル端末の横画面（ランドスケープ）検出
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < window.innerHeight && window.innerWidth < 850;
    }
    return false;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth < 850);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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

  // 画面上部のトースト通知（3秒表示）
  const showToast = useCallback(
    (type: ToastAlert['type'], title: string, message: string) => {
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
      }, 3000);
    },
    []
  );

  // ミュート切替
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
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

  // 張り紙を既読にする
  const handleMarkRuleRead = useCallback((id: string) => {
    setReadRuleIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // ゲーム開始・リトライ初期化（15FのPREPAREフェーズから開始）
  const startGame = () => {
    if (fanTimerRef.current) {
      window.clearInterval(fanTimerRef.current);
      fanTimerRef.current = null;
    }
    soundManager.init();
    soundManager.playButtonClick('SWITCH');
    soundManager.stopDoorMotor();
    soundManager.stopMotorDrone();
    soundManager.stopRapidVentilation();
    soundManager.stopMiasmaHeartbeat();
    soundManager.stopAnomalyPresence();
    soundManager.stopPryingLoop();

    recentVisitorIdsRef.current = [];
    decisionLockedRef.current = false;
    isHoldingOpenRef.current = false;
    doorPercentRef.current = 0;
    isPeekTransformedRef.current = false;
    peekFreezeTicksRef.current = 0;
    movingEventRef.current = null;
    floorsSinceLastMovingEventRef.current = 1;
    mirrorGhostTriggeredCountRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);

    setFloor(15);
    setSanity(MAX_SANITY);
    setComplaints(0);
    setGameOverReason('');
    setDoorOpenPercent(0);
    setIsHoldingOpen(false);
    setCurrentVisitor(null);
    setIsPeekTransformed(false);
    setActivePassengers([]);
    setBoardedSafeCount(0);
    setRepelledThreatCount(0);
    setIsFanOn(false);
    setMovingEvent(null);
    setEventOutcome(null);
    setJumpscareFlash(false);
    setScreenShake('NONE');
    setReadRuleIds([]);
    setIsInspectingModalOpen(false);
    setToastAlert(null);

    mirrorGhostTriggeredCountRef.current = 0;
    miasmaTriggeredCountRef.current = 0;
    floorsSinceLastMovingEventRef.current = 1;

    setActiveSubtitle(
      '「【15F 待機中】左パネルの管理組合規程（3枚）を確認し、右操作盤の『▼ 下降開始』を押して業務を開始してください。」'
    );
    setGameState('PREPARE');
  };

  // PREPARE（15F・10F・5F）から下降を開始/再開する
  const handleStartDescent = () => {
    if (gameState !== 'PREPARE') return;
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

      soundManager.stopDoorMotor();
      soundManager.stopPryingLoop();
      soundManager.stopAnomalyPresence();

      const visitor = currentVisitor;
      let nextSanity = sanityRef.current;
      let nextComplaints = complaintsRef.current;
      let outcome: EventOutcome;

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
            title: '【侵入許可】怪異を乗車させてしまった',
            detail: `${timeoutPrefix}精神力 -${visitor.sanityDamage}`,
            sanityDelta: -visitor.sanityDamage,
            complaintDelta: 0,
          };
          setActiveSubtitle(visitor.enteredDialogue);
          showToast(
            'DANGER',
            '【侵入検知】精神汚染発生',
            `危険な存在が車内に侵入しました。精神力 -${visitor.sanityDamage}。`
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
            title: '【排除成功】危険な対象を遮断',
            detail: `${floor}F 通過完了`,
            sanityDelta: 0,
            complaintDelta: 0,
          };
          setActiveSubtitle(visitor.rejectedDialogue);
        } else {
          // 正規の住人・警備員を誤って閉め出した → クレーム +1 ＆ 上部トースト3秒表示
          soundManager.playComplaintBuzzer();
          setScreenShake('SUBTLE');
          nextComplaints = Math.min(MAX_COMPLAINTS, nextComplaints + 1);
          setComplaints(nextComplaints);

          outcome = {
            type: 'MISTAKE_REJECTED_RESIDENT',
            title: '【通報】正規の住人を締め出した',
            detail: `苦情累積 ${nextComplaints}/${MAX_COMPLAINTS}`,
            sanityDelta: 0,
            complaintDelta: 1,
          };
          setActiveSubtitle(visitor.rejectedDialogue);
          showToast(
            'COMPLAINT',
            `【通報】不当閉鎖苦情 (${nextComplaints}/${MAX_COMPLAINTS})`,
            '正規住人を締め出したため管理室へ通報されました（累積3件で業務停止）。'
          );
        }
      }

      setEventOutcome(outcome);
      setGameState('EVENT_RESULT');
    },
    [currentVisitor, floor, showToast]
  );

  // 下降完了後に次の階へ到着させる共通遷移処理（同乗者の自動降車を含む）
  const completeDescentToNextFloor = useCallback(
    (currentFloor: number) => {
      soundManager.stopMotorDrone();
      soundManager.stopMiasmaHeartbeat();
      movingEventRef.current = null;
      setMovingEvent(null);
      setJumpscareFlash(false);

      // 精神力0またはクレーム上限3ならゲームオーバー
      if (sanityRef.current <= 0) {
        soundManager.playJumpscareNoise();
        setGameOverReason(
          '下降中の車内異変（有毒な瘴気または背後の怪異）に対処できず、精神力が尽きました。'
        );
        setGameState('GAMEOVER');
        return;
      }
      if (complaintsRef.current >= MAX_COMPLAINTS) {
        soundManager.playJumpscareNoise();
        setGameOverReason(
          '乗客からのクレーム累積が3回に達したため、管理室より昇降機が強制ロックされ、シャフト内の怪異に呑み込まれました。'
        );
        setGameState('GAMEOVER');
        return;
      }

      const nextFloor = currentFloor - 1;
      setFloor(nextFloor);

      // 1階に到達したらゲームクリア！
      if (nextFloor <= 1) {
        soundManager.playClearChime();
        soundManager.playDoorSlide(0.8, true);
        setDoorOpenPercent(100);
        setScreenShake('NONE');
        setActivePassengers([]);
        setActiveSubtitle('「【業務完了】1階エントランスに到達しました。すべての運行シフトを完了し、生還を確認しました。」');
        setGameState('CLEAR');
        return;
      }

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

      // 10F・5Fは中間チェックポイント（訪問者は現れず、新しい張り紙が2枚追加されPREPARE状態で停止）
      if (nextFloor === 10 || nextFloor === 5) {
        soundManager.playCheckpointNotice();
        setCurrentVisitor(null);
        setEventOutcome(null);
        setScreenShake('NONE');

        if (nextFloor === 10) {
          showToast(
            'INFO',
            '【待機所】10F 停止中',
            '管理室より最新規程が届きました。確認後、運行を再開してください。'
          );
          setActiveSubtitle(
            '「【10F 待機所】追加規程（2枚）を確認し、『▼ 下降再開』を押して運行を継続してください。」'
          );
        } else {
          showToast(
            'INFO',
            '【待機所】5F 停止中',
            '低層階の緊急告示が届きました。確認後、運行を再開してください。'
          );
          setActiveSubtitle(
            '「【5F 待機所】低層階の緊急告示（2枚）を確認し、『▼ 下降再開』を押して運行を継続してください。」'
          );
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

  // 1. MOVING フェーズの管理（1回の移動につき最大1つのイベントを30〜40%程度の確率で発生）
  useEffect(() => {
    if (gameState !== 'MOVING') return;

    soundManager.startMotorDrone();
    setScreenShake('SUBTLE');
    setJumpscareFlash(false);
    setMovingEvent(null);
    movingEventRef.current = null;

    const passengers = activePassengersRef.current;
    const pendingRequester = passengers.find(
      (p) => p.pendingRequest && !p.requestFulfilled
    );
    const sleeperPassenger = passengers.find((p) => p.visitor.isCabinSleeper);

    // 1回の移動につき最大1つまでのイベント選出
    let scheduledEvent: MovingCabinEvent | null = null;
    const quietStreak = floorsSinceLastMovingEventRef.current;

    if (pendingRequester && pendingRequester.pendingRequest) {
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
      mirrorGhostTriggeredCountRef.current < 1 &&
      (sleeperPassenger ||
        (passengers.length > 0 && (quietStreak >= 1 && Math.random() < 0.65 || floor <= 3)) ||
        (passengers.length === 0 && floor <= 4 && (quietStreak >= 1 && Math.random() < 0.60 || floor === 3)))
    ) {
      // 非常ベル対応イベント（5階以下・鏡面怪異）：出現確率を底上げ（同乗者がいない場合でも鏡に怪異が映る）
      mirrorGhostTriggeredCountRef.current += 1;
      const targetPassenger = sleeperPassenger || (passengers.length > 0 ? passengers[0] : null);
      const ghostPrompts = targetPassenger
        ? [
            '「『……ねえ、もう死んでるのに何階へ行くの？ ……後ろ、振り向かないでね』――扉の鏡面に怪異の影！ 直ちに非常ベルを押してください！」',
            '「『……クスクス、あなたのすぐ後ろ、すごく冷たいでしょう？』――閉まった金属扉に怪異が映り込んでいます！ 直ちに非常ベルを押してください！」',
          ]
        : [
            '「『……ふふ、ひとりぼっちだと思った？ あなたの後ろ、立ってるよ』――誰もいないはずの扉の鏡面に異様な影！ 直ちに非常ベルを押してください！」',
            '「『……クスクス、後ろ……振り向かないでね』――金属扉の鏡面に巨大な人影が接近中！ 直ちに非常ベルを押してください！」',
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
      miasmaTriggeredCountRef.current < 2 &&
      ((quietStreak >= 2 && Math.random() < 0.20) || quietStreak >= 5)
    ) {
      // 瘴気の発生（急速換気対応）：頻度を抑制（1ゲーム全体で1〜2回程度）
      miasmaTriggeredCountRef.current += 1;
      scheduledEvent = {
        id: `miasma-${Date.now()}`,
        type: 'MIASMA',
        requiredAction: 'FAN',
        timeLeftMs: EVENT_MOVING_WINDOW_MS,
        maxTimeMs: EVENT_MOVING_WINDOW_MS,
        status: 'ACTIVE',
        promptText:
          '「【車内異常】床下から黒紫色の有毒ガスが噴出！ 直ちに急速換気ボタンを押して排気してください！」',
      };
    }

    // イベントが発生しない静かな下降回（緩急をつける）
    if (!scheduledEvent) {
      floorsSinceLastMovingEventRef.current += 1;
      if (passengers.length > 0) {
        setActiveSubtitle(
          `「【下降巡航】${floor - 1}階へ降下中……（車内同乗者 ${passengers.length} 名・異常なし）」`
        );
      } else {
        setActiveSubtitle(`「【下降巡航】${floor - 1}階へ降下中……（車内異常なし）」`);
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
    setActiveSubtitle(`「【異常降下】${floor - 1}階へ下降中……（シャフト駆動音に変調が発生）」`);

    let countdownInterval: number | null = null;
    let finishInterval: number | null = null;
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
          showToast(
            'DANGER',
            '【警報】有毒ガスの充満',
            '直ちに急速換気を起動してください。放置すると精神力を削られます。'
          );
        } else if (scheduledEvent.type === 'MIRROR_GHOST') {
          soundManager.playMirrorGhostAppear();
          showToast(
            'DANGER',
            '【異常】背後侵蝕',
            '直ちに非常ベルを押してください。決して振り返ってはいけません。'
          );
        }

        movingEventRef.current = scheduledEvent;
        setMovingEvent(scheduledEvent);
        setActiveSubtitle(scheduledEvent.promptText);

        const tickMs = 50;
        countdownInterval = window.setInterval(() => {
          if (isPausedRef.current) return;
          const currentEv = movingEventRef.current;
          if (!currentEv) return;

          // プレイヤーが既に対処成功（RESOLVED）した場合：余韻を持たせて長く下降
          if (currentEv.status === 'RESOLVED') {
            if (countdownInterval) {
              window.clearInterval(countdownInterval);
              countdownInterval = null;
            }
            let successRemaining = 1800; // 成功後の降下時間を1.8秒に延長
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
            // 制限時間切れ（FAILED）：余韻を持たせて長く下降
            if (countdownInterval) {
              window.clearInterval(countdownInterval);
              countdownInterval = null;
            }
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
                '「【呼吸困難】有毒ガスを吸い込んでしまった……激しい眩暈により精神力 -1。」'
              );
              showToast(
                'DANGER',
                '【精神汚染】毒素吸引',
                '有毒ガスを吸入。精神力 -1。'
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
                '「『見ィつけた』――扉の鏡面から伸びた冷たい影に襲われた。精神力 -1。」'
              );
              showToast(
                'DANGER',
                '【背後侵蝕】怪異の襲撃',
                '背後の怪異に襲われました。精神力 -1。'
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
                '「『おい、無視するな！ 組合に言いつけてやる！』【苦情発生】同乗要求不履行。」'
              );
              showToast(
                'COMPLAINT',
                `【通報】要求無視 (${nextComplaints}/${MAX_COMPLAINTS})`,
                '車内要求を放置したため管理室へ通報。'
              );
            }

            let failRemaining = 2000; // 失敗後の降下時間を2.0秒に延長
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

  // 2. ARRIVING フェーズの管理（ベルが鳴り、扉が12%まで自動で開く）
  useEffect(() => {
    if (gameState !== 'ARRIVING') return;

    setScreenShake('NONE');
    setIsPeekTransformed(false);
    isPeekTransformedRef.current = false;
    peekFreezeTicksRef.current = 0;

    const isAnomaly =
      currentVisitor?.category === 'ANOMALY' ||
      (currentVisitor?.requiredCloseClicks ?? 1) > 1;
    soundManager.playArrivalChime(isAnomaly);
    soundManager.playDoorSlide(0.5, true);

    doorPercentRef.current = 12;
    setDoorOpenPercent(12);
    setActiveSubtitle(`「【${floor}F 到着】扉がわずかに開きました。相手の身元を規程と照合してください。」`);

    let arrivingRemaining = ARRIVING_DURATION_MS;
    const timer = window.setInterval(() => {
      if (isPausedRef.current) return;
      arrivingRemaining -= 50;
      if (arrivingRemaining <= 0) {
        window.clearInterval(timer);
        decisionLockedRef.current = false;
        setJudgingTimeLeftMs(JUDGING_DURATION_MS);
        if (currentVisitor) {
          setActiveSubtitle(currentVisitor.dialogue);

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
        setGameState('JUDGING');
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [gameState, floor, currentVisitor]);

  // 3. JUDGING フェーズ（8.0秒ベース ＋ 張り紙拡大中は0.25倍速 ＋ 65%覗き込み段階変化）
  useEffect(() => {
    if (gameState !== 'JUDGING') return;

    const intervalMs = 50;
    const timer = setInterval(() => {
      if (decisionLockedRef.current || isPausedRef.current) return;

      // モーダルを開いている間は時間の経過速度を 0.25倍速 に落とす
      const elapsedDelta = isModalOpenRef.current ? intervalMs * 0.25 : intervalMs;

      setJudgingTimeLeftMs((prev) => {
        const next = prev - elapsedDelta;
        if (next <= 0) {
          resolveJudgingDecision('TIMEOUT_BOARD');
          return 0;
        }
        return next;
      });

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
            `危険個体（${currentVisitor?.name || '不明'}）をエレベーター内に招き入れ、精神力が尽きました。${currentVisitor?.description || ''}`
          );
          setGameState('GAMEOVER');
          return;
        }

        if (complaintsRef.current >= MAX_COMPLAINTS) {
          soundManager.playJumpscareNoise();
          setGameOverReason(
            '乗客からのクレームが3回累積し、管理組合によってエレベーターが封鎖・隔離処分されました。'
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

  // 操作盤ハンドラ：開（OPEN）長押し開始・終了
  const handleStartHoldOpen = () => {
    if (isPausedRef.current || gameState !== 'JUDGING' || decisionLockedRef.current) return;
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
    if (gameState === 'JUDGING' && !decisionLockedRef.current && doorPercentRef.current > 12) {
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
      }, 160);
      setTimeout(() => {
        setScreenShake('NONE');
      }, 340);

      // 閉まりかけた扉が怪異の怪力で一気に36%まで押し戻されるリアルな挙動
      doorPercentRef.current = 6;
      setDoorOpenPercent(6);
      setTimeout(() => {
        if (!decisionLockedRef.current && gameState === 'JUDGING') {
          doorPercentRef.current = 36;
          setDoorOpenPercent(36);
        }
      }, 120);
      setActiveSubtitle(
        `「【扉破壊警報】怪異が扉をこじ開けようとしています！ 閉ボタンを連打して押し返してください！（残り ${nextRemaining} 回）」`
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
        '「【急速換気稼働】強力な排気ファンが起動。毒素をダクトへ排出し、車内の空気を浄化しました。」'
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
    if (activePassengersRef.current.length > 0) {
      soundManager.playComplaintBuzzer();
      setScreenShake('SUBTLE');
      window.setTimeout(() => setScreenShake('NONE'), 300);

      const nextComplaints = Math.min(MAX_COMPLAINTS, complaintsRef.current + 1);
      setComplaints(nextComplaints);
      setActiveSubtitle(
        '「『ちょっと！ 異常もないのに風が強くてうるさいわ！ 管理室に通報するからね！』【通報】不要な換気により苦情が発生しました。」'
      );
      showToast(
        'COMPLAINT',
        `【通報】不要稼働苦情 (${nextComplaints}/${MAX_COMPLAINTS})`,
        '平時の強制排気により乗客から通報。3件で隔離処分。'
      );

      if (nextComplaints >= MAX_COMPLAINTS && gameState !== 'EVENT_RESULT') {
        soundManager.stopMotorDrone();
        soundManager.playJumpscareNoise();
        setGameOverReason(
          'むやみな急速換気による苦情累積が3件に達したため、管理室より昇降機が保安隔離処分されました。'
        );
        setGameState('GAMEOVER');
      }
    } else {
      setActiveSubtitle(
        '「【急速換気稼働】強制排気中。異常がない平時の稼働は苦情の対象となります。」'
      );
    }
  };

  // 操作盤ハンドラ：非常ベル押下（車内怪異の緊急排除 ＆ 扉こじ開け怪異の威嚇）
  const handlePressBell = () => {
    if (isPausedRef.current) return;
    soundManager.playEmergencyBell();
    setScreenShake('VIOLENT');
    setTimeout(() => setScreenShake('NONE'), 320);

    const currentEv = movingEventRef.current;

    // 1. 下降中の「車内怪異豹変・鏡面反射（MIRROR_GHOST）」への緊急停止＆排除
    if (
      gameState === 'MOVING' &&
      currentEv &&
      currentEv.type === 'MIRROR_GHOST' &&
      currentEv.status === 'ACTIVE'
    ) {
      soundManager.playElevatorJolt();
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

      setActiveSubtitle(
        '「【非常ベル作動】大音量の警鐘と急ブレーキにより、背後に忍び寄った怪異を車外へ振り落としました。」'
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
        '「【警報作動】非常ベルの轟音に怪異が怯みました！ 直ちに【閉】ボタンを押して扉を閉めてください！」'
      );
    }
  };

  const isSlowMotionActive = gameState === 'JUDGING' && isInspectingModalOpen;

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
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-between metal-wall select-none touch-manipulation"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* スマホ縦画面時の横画面回転要求オーバーレイ */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div
            id="mobile-rotate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none font-mincho"
          >
            <div className="aged-paper border-2 border-stone-800 p-6 rounded-xs max-w-sm w-full text-stone-900 shadow-2xl relative">
              <div className="border border-red-800 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rotate-[-4deg] inline-block mb-3">
                端末規格外警報
              </div>
              <div className="my-3 flex justify-center">
                <Smartphone
                  className="w-14 h-14 text-stone-800 rotate-90 animate-pulse"
                />
              </div>
              <h2 className="text-xl font-extrabold text-stone-950 tracking-wider mb-2">
                【警告】画面を横向きに回転してください
              </h2>
              <p className="text-xs text-stone-800 font-bold leading-relaxed mb-4">
                当昇降機の監視端末は「横画面表示（ランドスケープ）」専用規格です。<br />
                端末の画面回転ロックを解除し、本体を横向きにして保持してください。
              </p>
              <div className="bg-stone-900/10 p-2.5 rounded-xs border border-stone-700/60 text-[11px] font-bold text-stone-700">
                ※横向きに回転すると自動的に検閲画面へ移行します
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* 画面上部のトースト通知（クレーム・チェックポイント・危険通知を3秒間表示） */}
      <AnimatePresence>
        {toastAlert && (
          <motion.div
            key={toastAlert.id}
            id="top-toast-alert"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.22 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded shadow-[0_10px_35px_rgba(0,0,0,0.95)] border-2 flex items-center gap-3 max-w-lg w-[92%] pointer-events-none ${
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
              <div className="text-xs opacity-90 leading-snug">
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

      {/* 上部ヘッダー（h-14 コンパクト1行） */}
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

      {/* メイン1画面レイアウト */}
      <main className="relative z-20 flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        {/* 左側パネル：張り紙一覧 */}
        <div className="col-span-3 h-full overflow-hidden">
          <NoticeBoard
            rules={INITIAL_NOTICE_RULES}
            currentFloor={floor}
            gameState={gameState}
            judgingTimeLeftMs={judgingTimeLeftMs}
            readRuleIds={readRuleIds}
            onMarkRuleRead={handleMarkRuleRead}
            onModalOpenChange={setIsInspectingModalOpen}
          />
        </div>

        {/* 中央メイン：エレベーターの両開き金属扉 */}
        <div className="col-span-6 h-full overflow-hidden relative">
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
          />
        </div>

        {/* 右側パネル：スリム操作盤 */}
        <div className="col-span-3 h-full overflow-hidden">
          <ControlPanel
            floor={floor}
            gameState={gameState}
            doorOpenPercent={doorOpenPercent}
            isHoldingOpen={isHoldingOpen}
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
          />
        </div>
      </main>

      {/* 下部エリア：訪問者のセリフ ＆ 同乗者ステータス */}
      <BottomConsole
        gameState={gameState}
        currentVisitor={currentVisitor}
        activeSubtitle={activeSubtitle}
        eventOutcome={eventOutcome}
        activePassengers={activePassengers}
        movingEvent={movingEvent}
      />

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
            {/* 公文書・業務辞令書風の重厚なUI（スマホ横画面でもはみ出さずスワイプ可能） */}
            <div className="max-w-xl w-full max-h-[92dvh] flex flex-col metal-panel-surface border-2 border-stone-700 p-2 sm:p-3.5 shadow-[0_25px_70px_rgba(0,0,0,0.98)] relative my-auto shrink-0">
              <div className="aged-paper border-2 border-stone-800 p-3.5 sm:p-6 text-stone-900 font-mincho relative shadow-inner overflow-y-auto overscroll-contain touch-pan-y min-h-0 flex-1">
                {/* 上部：文書番号・朱印 */}
                <div className="flex items-start justify-between border-b-2 border-stone-800 pb-2.5 mb-3 sm:mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-stone-700 tracking-widest block">
                      管理組合 保安課 発令（機密第拾伍號）
                    </span>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-stone-950 tracking-wider mt-0.5">
                      第十五號昇降機
                    </h1>
                    <span className="text-xs font-extrabold text-red-900 tracking-widest block mt-0.5">
                      ― 夜間特別検閲業務 辞令書 ―
                    </span>
                  </div>
                  <div className="border-2 border-red-800 text-red-800 font-extrabold text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rotate-[-5deg] shrink-0 text-center leading-tight">
                    <div>保安課印</div>
                    <div className="text-[10px] border-t border-red-800 mt-0.5 pt-0.5">極秘扱</div>
                  </div>
                </div>

                {/* リード文 */}
                <p className="text-xs sm:text-sm text-stone-900 font-bold mb-3 sm:mb-4 leading-relaxed">
                  貴殿に、当ビル「第十五號昇降機」の夜間検閲業務を命じます。15階から1階へと降下しながら、各階で乗車を求める者の身元を厳格に照合・選別してください。
                </p>

                {/* 罫線枠の業務要綱（3箇条） */}
                <div className="border-2 border-stone-800 divide-y divide-stone-700/80 bg-stone-900/5 text-xs leading-relaxed mb-4">
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-stone-950 block mb-0.5 font-bold">
                      【第一条：扉操作と身元照合】
                    </strong>
                    <span className="text-stone-800">
                      「開扉」ボタンを長押しして隙間を広げ、胸元の名札・服装・眼光を照合してください。正規居住者は全開にして乗車を許可し、規程違反者や怪異は直ちに「閉扉」を押して遮断・排除すること。（扉に手をかけて侵入を試みる個体には「閉扉」を連打してください）
                    </span>
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-stone-950 block mb-0.5 font-bold">
                      【第二条：通達文書の改定】
                    </strong>
                    <span className="text-stone-800">
                      15階・10階・5階の待機所にて、管理室より新たな追加通達が下達されます。最新の張り紙は以前の規則を上書きするため、常に最新の通達に従って検閲を行ってください。
                    </span>
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <strong className="text-red-950 block mb-0.5 font-bold">
                      【第三条：車内保安と隔離処分】
                    </strong>
                    <span className="text-stone-800">
                      下降中の有毒瘴気には「急速換気」、背後に迫る怪異には「非常ベル」で対処してください。精神が尽きるか、住人からの苦情通報が3回累積した時点で、直ちに隔離処分（業務失敗）となります。
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
                  <span>【着務宣誓】15階 検問待機所へ入室する</span>
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
                    管理組合 特別対策室 // 事後監査記録
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-red-100 mt-0.5">
                    保安隔離・業務失敗
                  </h2>
                </div>
                <div className="border-2 border-red-500 text-red-400 font-extrabold text-xs px-2 py-1 rotate-[-5deg] shrink-0">
                  殉職処理
                </div>
              </div>

              <div className="flex justify-center my-3">
                <Skull className="w-12 h-12 text-red-500 animate-pulse" />
              </div>

              <div className="bg-red-950/50 border-2 border-red-800 p-4 rounded-xs text-sm text-red-100 mb-6 leading-relaxed text-left">
                <div className="text-xs font-bold text-red-400 mb-1.5 flex items-center gap-1.5 border-b border-red-900/80 pb-1">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>【事故報告書】第十五號昇降機（最終確認地点：{floor}階）</span>
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
                <span>【再着務】15階より検閲業務をやり直す</span>
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
            className="fixed inset-0 z-50 bg-black/88 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
          >
            <div className="max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain touch-pan-y metal-panel-surface border-2 border-stone-600 p-2 sm:p-3 shadow-[0_0_70px_rgba(16,185,129,0.3)] my-auto shrink-0">
              <div className="aged-paper border-2 border-stone-800 p-4 sm:p-6 text-stone-900 font-mincho">
                <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
                  <div className="text-left">
                    <span className="text-xs font-bold text-stone-700 tracking-widest block">
                      管理組合 保安課 // 業務完了証明
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 mt-0.5">
                      全シフト検閲完了・生還
                    </h2>
                  </div>
                  <div className="border-2 border-emerald-800 text-emerald-900 font-extrabold text-xs px-2.5 py-1 rotate-[-5deg] shrink-0">
                    検閲済
                  </div>
                </div>

                <div className="flex justify-center my-2">
                  <ShieldCheck className="w-11 h-11 text-emerald-800" />
                </div>

                <p className="text-xs sm:text-sm text-stone-900 font-bold mb-4 leading-relaxed text-left">
                  重苦しい鉄扉が開き、1階ロビーの冷たい夜気が流れ込んできました。貴殿は次々と書き換わる規程と異形の偽装を見極め、本日の夜間検閲シフトを無事に完遂しました。
                </p>

                <div className="grid grid-cols-3 divide-x divide-stone-700 border-2 border-stone-800 bg-stone-900/5 mb-5 text-center text-xs">
                  <div className="p-2 sm:p-2.5">
                    <span className="text-stone-700 font-bold block text-[10px]">残存精神安定度</span>
                    <span className="text-lg font-extrabold text-emerald-900">
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
                  className="w-full py-3 px-6 bg-stone-900 hover:bg-stone-800 border-2 border-emerald-600/70 text-emerald-400 font-black tracking-widest rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>【再着務】15階より次のシフトに就く</span>
                </button>
              </div>
            </div>
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
                  【業務中断】保安点検待機
                </span>
                <span className="text-xs font-bold text-stone-400">現在地：{floor}階</span>
              </div>

              <Pause className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-pulse" />
              <h2 className="text-xl font-extrabold text-stone-100 mb-2 tracking-wider">
                昇降機 一時停止中
              </h2>
              <p className="text-xs text-stone-300 mb-6 leading-relaxed">
                現在、昇降機の運行を一時停止しています。<br />
                検閲業務へ復帰する際は、下記の復帰ボタンを押してください。
              </p>

              <button
                id="resume-game-btn"
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3 px-6 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black tracking-widest rounded-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>【業務再開】検閲シフトへ復帰する</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;

