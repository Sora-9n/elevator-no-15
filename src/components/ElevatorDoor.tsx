import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Wind } from 'lucide-react';
import type { GameState, MovingCabinEvent, VisitorData } from '../types/game';
import { VisitorView } from './VisitorView';
import { PryingHand } from './PryingHand';

interface ElevatorDoorProps {
  doorOpenPercent: number; // 0 〜 100
  floor: number;
  gameState: GameState;
  currentVisitor: VisitorData | null;
  closeClicksRemaining: number;
  isHoldingOpen: boolean;
  isPeekTransformed: boolean;
  movingEvent: MovingCabinEvent | null;
  isFanOn: boolean;
  isArrivingFlash: boolean;
  isKeyWomanAlertActive: boolean;
  onOpenMemo?: () => void;
}

export const ElevatorDoor: React.FC<ElevatorDoorProps> = React.memo(({
  doorOpenPercent,
  floor,
  gameState,
  currentVisitor,
  closeClicksRemaining,
  isHoldingOpen,
  isPeekTransformed,
  movingEvent,
  isFanOn,
  isArrivingFlash,
  isKeyWomanAlertActive,
  onOpenMemo,
}) => {
  const slideOffsetPercent = Math.max(0, Math.min(100, doorOpenPercent)) * 0.92;

  const isPryingDoor =
    currentVisitor &&
    currentVisitor.requiredCloseClicks > 1 &&
    gameState === 'JUDGING' &&
    closeClicksRemaining > 0;

  const isIncrementalDoorMotion = gameState === 'JUDGING' || gameState === 'FINAL_DOOR';
  const doorTransformTransition = isIncrementalDoorMotion
    ? 'transform 65ms linear'
    : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)';

  const isMiasmaEvent = movingEvent?.type === 'MIASMA';
  const isMirrorGhostEvent = movingEvent?.type === 'MIRROR_GHOST';

  // 下降中イベントの緊迫度 (0.0 -> 1.0)
  const eventUrgency = movingEvent
    ? Math.max(0, Math.min(1, 1 - movingEvent.timeLeftMs / movingEvent.maxTimeMs))
    : 0;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      {/* エレベーター扉の外枠 */}
      <div
        className={`relative w-full h-full border-x-[6px] md:border-x-[12px] border-t-[6px] md:border-t-[8px] border-b-[8px] md:border-b-[12px] border-stone-900 shadow-[inset_0_0_50px_rgba(0,0,0,0.95)] overflow-hidden bg-black ${
          isPryingDoor
            ? 'door-prying-shake'
            : isFanOn
            ? 'fan-duct-vibration'
            : isMiasmaEvent && movingEvent?.status === 'ACTIVE'
            ? 'miasma-vision-warp'
            : ''
        }`}
      >
        {/* 奥のレイヤー：暗い廊下と訪問者ビジュアル */}
        <VisitorView
          visitor={currentVisitor}
          floor={floor}
          gameState={gameState}
          doorOpenPercent={doorOpenPercent}
          closeClicksRemaining={closeClicksRemaining}
          isHoldingOpen={isHoldingOpen}
          isPeekTransformed={isPeekTransformed}
        />

        {/* 手前のレイヤー：左側の金属扉（GPU translate3dで描画） */}
        <div
          id="elevator-door-left"
          className={`absolute top-0 bottom-0 left-0 w-1/2 metal-door-surface border-r-[4px] z-20 flex flex-col justify-center overflow-visible shadow-[14px_0_35px_rgba(0,0,0,0.95)] ${
            isPryingDoor
              ? 'border-red-600 shadow-[14px_0_40px_rgba(220,38,38,0.6)]'
              : 'border-stone-950'
          }`}
          style={{
            transform: `translate3d(-${slideOffsetPercent}%, 0, 0)`,
            willChange: 'transform',
            transition: doorTransformTransition,
          }}
        >
          <div className="mx-4 h-3/5 border border-stone-800/45 bg-black/15 rounded-xs" />
          <div
            className={`absolute top-0 bottom-0 right-0 w-2.5 shadow-xl transition-colors ${
              isPryingDoor ? 'bg-red-800 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-stone-950'
            }`}
          />

          {/* ★ 扉をこじ開けようと右エッジ（合わせ目）に食い込む怪異の手 */}
          <AnimatePresence>
            {isPryingDoor && (
              <PryingHand
                side="left"
                closeClicksRemaining={closeClicksRemaining}
              />
            )}
          </AnimatePresence>
        </div>

        {/* 手前のレイヤー：右側の金属扉（GPU translate3dで描画） */}
        <div
          id="elevator-door-right"
          className={`absolute top-0 bottom-0 right-0 w-1/2 metal-door-surface border-l-[4px] z-20 flex flex-col justify-center overflow-visible shadow-[-14px_0_35px_rgba(0,0,0,0.95)] ${
            isPryingDoor
              ? 'border-red-600 shadow-[-14px_0_40px_rgba(220,38,38,0.6)]'
              : 'border-stone-950'
          }`}
          style={{
            transform: `translate3d(${slideOffsetPercent}%, 0, 0)`,
            willChange: 'transform',
            transition: doorTransformTransition,
          }}
        >
          <div className="mx-4 h-3/5 border border-stone-800/45 bg-black/15 rounded-xs" />
          <div
            className={`absolute top-0 bottom-0 left-0 w-2.5 shadow-xl transition-colors ${
              isPryingDoor ? 'bg-red-800 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-stone-950'
            }`}
          />

          {/* ★ 扉をこじ開けようと左エッジ（合わせ目）に食い込む怪異の手 */}
          <AnimatePresence>
            {isPryingDoor && (
              <PryingHand
                side="right"
                closeClicksRemaining={closeClicksRemaining}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================
            ★ 演出A：ステンレス扉への「背後（肩越し）の怪異の鏡面映り込み」演出
            ============================================================ */}
        <AnimatePresence>
          {isMirrorGhostEvent && movingEvent && (
            <motion.div
              key="mirror-ghost-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-24 pointer-events-none overflow-hidden flex items-center justify-center"
            >
              {/* 車内の照明が赤黒く点滅するオーバーレイ（2F試練達成時は消灯） */}
              {!(movingEvent.isKeyWomanTrial && movingEvent.status === 'FAILED') && (
                <div className="absolute inset-0 cabin-red-black-flicker mix-blend-multiply" />
              )}

              {/* ステンレス扉表面の鏡面反射レイヤー */}
              <motion.div
                animate={
                  movingEvent.status === 'FAILED'
                    ? movingEvent.isKeyWomanTrial
                      ? { scale: 0.96, y: 0, opacity: 0.55 }
                      : { scale: 2.35, y: 30, opacity: 1 }
                    : movingEvent.status === 'RESOLVED'
                    ? { scale: 0.7, opacity: 0 }
                    : {
                        scale: 1.0 + eventUrgency * 0.38,
                        y: [0, -3, 2, 0],
                        opacity: 0.78 + eventUrgency * 0.2,
                      }
                }
                transition={
                  movingEvent.status === 'FAILED'
                    ? { duration: 0.22, ease: 'easeIn' }
                    : { duration: 0.35 }
                }
                className="relative w-full h-full flex items-end justify-center"
                style={{
                  mixBlendMode: 'screen',
                  willChange: 'transform, opacity',
                }}
              >
                <svg viewBox="0 0 360 440" className="w-full h-full">
                  <defs>
                    <radialGradient id="mirrorGhostAura" cx="50%" cy="42%" r="52%">
                      <stop offset="0%" stopColor="rgba(185, 28, 28, 0.55)" />
                      <stop offset="60%" stopColor="rgba(30, 10, 15, 0.35)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>
                    <linearGradient id="mirrorMetalStreak" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                      <stop offset="48%" stopColor="rgba(255,255,255,0.12)" />
                      <stop offset="50%" stopColor="rgba(0,0,0,0.85)" />
                      <stop offset="52%" stopColor="rgba(255,255,255,0.12)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </linearGradient>
                  </defs>

                  {/* 背後の怪異の赤黒いオーラ */}
                  <ellipse cx="195" cy="185" rx="145" ry="165" fill="url(#mirrorGhostAura)" />

                  {/* プレイヤー自身の背面シルエット（首・肩・襟元のキアロスクーロ表現） */}
                  <g opacity="0.72">
                    <path
                      d="M 88 440 L 102 336 C 110 314, 128 308, 144 302 L 146 286 L 174 286 L 176 302 C 192 308, 210 314, 218 336 L 232 440 Z"
                      fill="#09090b"
                      stroke="rgba(168,162,158,0.22)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M 160 228 C 136 228, 125 248, 128 274 C 130 288, 138 298, 160 300 C 182 298, 190 288, 192 274 C 195 248, 184 228, 160 228 Z"
                      fill="#0c0a09"
                      stroke="rgba(168,162,158,0.24)"
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* ★ プレイヤーの右肩越し（背後）に不気味に覗き込む怪異のキアロスクーロ彫刻影と顔 */}
                  <g transform="translate(212, 168) rotate(-16)">
                    {/* 怪異の歪んだ胴体・鎖骨・不自然に伸びた首柱 */}
                    <path
                      d="M -88 260 L -62 68 C -48 42, -26 34, -15 24 L -13 -4 L 13 -4 L 15 24 C 26 34, 48 42, 62 68 L 88 260 Z"
                      fill="#09090b"
                      stroke="rgba(220, 38, 38, 0.42)"
                      strokeWidth="1.6"
                    />
                    {/* 首筋の筋と鎖骨の深い影 */}
                    <path
                      d="M -11 0 L -4 34 M 11 0 L 4 34 M -32 36 Q 0 46 32 36"
                      fill="none"
                      stroke="#7f1d1d"
                      strokeWidth="1.8"
                    />
                    {/* 顔の両脇に垂れ下がる濡れた黒髪のシルエット */}
                    <path
                      d="M 0 -78 C -36 -78, -52 -52, -50 -10 L -56 64 L -40 42 L -36 -12 L 36 -12 L 40 42 L 56 64 L 50 -10 C 52 -52, 36 -78, 0 -78 Z"
                      fill="#050507"
                    />
                    {/* 強い逆光に沈む頭蓋シルエット（顔内部の鼻筋等を廃し、輪郭のリムライトと目・口のみを強調） */}
                    <path
                      d="M 0 -70 C -30 -70, -44 -48, -42 -20 C -40 -4, -34 12, -24 24 C -14 34, -6 38, 0 39 C 6 38, 14 34, 24 24 C 34 12, 40 -4, 42 -20 C 44 -48, 30 -70, 0 -70 Z"
                      fill="#100d10"
                      stroke="rgba(248, 113, 113, 0.55)"
                      strokeWidth="1.6"
                    />
                    {/* 右半面のさらに深い漆黒の影 */}
                    <path
                      d="M 0 -70 C 4 -42, 2 -14, 0 39 C 8 38, 16 34, 24 24 C 34 12, 40 -4, 42 -20 C 44 -48, 30 -70, 0 -70 Z"
                      fill="#070507"
                    />
                    {/* 額に張り付く前髪のシルエット */}
                    <path
                      d="M -42 -32 L -28 -46 L -18 -30 L -6 -48 L 6 -28 L 18 -46 L 30 -30 L 42 -34 C 38 -56, 24 -70, 0 -70 C -24 -70, -38 -56, -42 -32 Z"
                      fill="#050507"
                    />

                    {/* 虚ろに陥没した漆黒の眼窩と、中心で白く燃える真紅の瞳孔 */}
                    <path
                      d="M -32 -25 C -27 -33, -10 -32, -7 -23 C -8 -14, -14 -10, -22 -10 C -30 -11, -33 -17, -32 -25 Z"
                      fill="#000000"
                    />
                    <circle cx="-19" cy="-21" r="4" fill="#dc2626" />
                    <circle cx="-19.5" cy="-21.5" r="1.5" fill="#ffffff" />

                    <path
                      d="M 7 -23 C 10 -32, 27 -33, 32 -25 C 33 -17, 30 -11, 22 -10 C 14 -10, 8 -14, 7 -23 Z"
                      fill="#000000"
                    />
                    <circle cx="19" cy="-21" r="4" fill="#dc2626" />
                    <circle cx="18.5" cy="-21.5" r="1.5" fill="#ffffff" />

                    {/* 耳元まで裂けた不気味な黒い笑みと歯列 */}
                    <path
                      d="M -26 8 Q 0 34 26 8 Q 0 18 -26 8 Z"
                      fill="#050507"
                      stroke="#dc2626"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M -18 12 L -15 21 L -10 13 L -5 23 L 0 14 L 5 23 L 10 13 L 15 21 L 18 12"
                      fill="none"
                      stroke="#fca5a5"
                      strokeWidth="1.4"
                    />
                  </g>

                  {/* 画面端（左右）からプレイヤーの肩と視界へ侵食してくる黒い手とノイズ */}
                  <g opacity={0.65 + eventUrgency * 0.35}>
                    {/* 左端から伸びる黒い異形の手 */}
                    <path
                      d={`M 0 180 L ${55 + eventUrgency * 45} 210 L ${45 + eventUrgency * 45} 222 L 0 205 Z`}
                      fill="#050505"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />
                    <path
                      d={`M 0 215 L ${68 + eventUrgency * 50} 238 L ${58 + eventUrgency * 50} 250 L 0 238 Z`}
                      fill="#050505"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />
                    <path
                      d={`M 0 250 L ${50 + eventUrgency * 45} 268 L ${42 + eventUrgency * 45} 278 L 0 268 Z`}
                      fill="#050505"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />
                    {/* 右端から伸びる黒い異形の手 */}
                    <path
                      d={`M 360 175 L ${300 - eventUrgency * 45} 205 L ${308 - eventUrgency * 45} 218 L 360 198 Z`}
                      fill="#050505"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />
                    <path
                      d={`M 360 210 L ${288 - eventUrgency * 50} 235 L ${296 - eventUrgency * 50} 248 L 360 232 Z`}
                      fill="#050505"
                      stroke="#991b1b"
                      strokeWidth="1.2"
                    />
                  </g>

                  {/* 扉の中央合わせ目による反射の分断ライン */}
                  <rect x="0" y="0" width="360" height="440" fill="url(#mirrorMetalStreak)" />
                </svg>
              </motion.div>

              {/* ★ 緊急照射（RESOLVED）時の天井防衛レーザー・高圧紫外線アーク閃光エフェクト */}
              <AnimatePresence>
                {movingEvent.status === 'RESOLVED' && (
                  <motion.div
                    key="uv-laser-purge"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0.9, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
                  >
                    {/* 強烈な青白いアーク閃光フラッシュ */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 25%, rgba(224, 242, 254, 0.85) 0%, rgba(56, 189, 248, 0.45) 45%, rgba(2, 6, 23, 0) 90%)',
                        mixBlendMode: 'screen',
                      }}
                    />

                    {/* 天井から車内を縦断して怪異を焼き払うレーザー光線群 */}
                    <svg viewBox="0 0 360 440" className="w-full h-full">
                      <defs>
                        <linearGradient id="purgeLaserBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                          <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.95" />
                          <stop offset="85%" stopColor="#0284c7" stopOpacity="0.7" />
                          <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* 交差・掃射する高出力防衛レーザー */}
                      <line x1="60" y1="0" x2="230" y2="440" stroke="url(#purgeLaserBeam)" strokeWidth="6" />
                      <line x1="60" y1="0" x2="230" y2="440" stroke="#ffffff" strokeWidth="2" />

                      <line x1="180" y1="0" x2="210" y2="440" stroke="url(#purgeLaserBeam)" strokeWidth="10" />
                      <line x1="180" y1="0" x2="210" y2="440" stroke="#ffffff" strokeWidth="3.5" />

                      <line x1="300" y1="0" x2="170" y2="440" stroke="url(#purgeLaserBeam)" strokeWidth="7" />
                      <line x1="300" y1="0" x2="170" y2="440" stroke="#ffffff" strokeWidth="2.5" />

                      <line x1="240" y1="0" x2="250" y2="440" stroke="url(#purgeLaserBeam)" strokeWidth="5" />

                      {/* 水平走査レーザーライン */}
                      <motion.line
                        x1="0"
                        y1="0"
                        x2="360"
                        y2="0"
                        stroke="#7dd3fc"
                        strokeWidth="4"
                        style={{ willChange: 'transform' }}
                        initial={{ y: 10 }}
                        animate={{ y: 420 }}
                        transition={{ duration: 0.45, ease: 'linear' }}
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 画面外周から侵食する赤黒いノイズビネット */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 45%, transparent ${Math.max(
                    18,
                    48 - eventUrgency * 28
                  )}%, rgba(127, 29, 29, 0.65) 75%, rgba(0, 0, 0, 0.96) 100%)`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            ★ 演出B：車内下部から立ち込める「紫〜黒緑色の瘴気（MIASMA）」と急速換気吸引
            ============================================================ */}
        <AnimatePresence>
          {isMiasmaEvent && movingEvent && (
            <motion.div
              key="miasma-fog-overlay"
              style={{ willChange: 'transform, opacity' }}
              initial={{ opacity: 0, y: 120 }}
              animate={
                movingEvent.status === 'RESOLVED'
                  ? {
                      opacity: 0,
                      y: -480,
                      scaleX: 0.48,
                      scaleY: 1.45,
                    }
                  : {
                      opacity: 0.92,
                      y: 0,
                      scaleX: 1,
                      scaleY: 1,
                    }
              }
              exit={{ opacity: 0, y: -320 }}
              transition={
                movingEvent.status === 'RESOLVED'
                  ? { duration: 0.95, ease: 'easeIn' }
                  : { duration: 0.55, ease: 'easeOut' }
              }
              className="absolute inset-0 z-24 pointer-events-none overflow-hidden"
            >
              {/* 下部から湧き上がる紫〜黒緑色の毒霧グラデーション */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(0deg, rgba(15, 25, 15, 0.96) 0%, rgba(59, 7, 100, 0.78) 42%, rgba(20, 83, 45, 0.58) 76%, rgba(88, 28, 135, 0.35) 100%)',
                }}
              />

              {/* うごめく瘴気のモヤ塊（radial-gradientの自然フェード＋GPU transformのみ） */}
              <motion.div
                animate={{
                  x: [-18, 18, -12, 0],
                  y: [10, -25, 5, -15],
                  scale: [1, 1.12, 1.05, 1],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-12 inset-x-[-15%] h-[85%] rounded-full"
                style={{
                  willChange: 'transform',
                  background:
                    'radial-gradient(ellipse at 50% 65%, rgba(107, 33, 168, 0.75) 0%, rgba(22, 101, 52, 0.65) 48%, transparent 80%)',
                }}
              />
              <motion.div
                animate={{
                  x: [22, -22, 14, 0],
                  y: [0, -35, -10, 0],
                }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-0 inset-x-[-10%] h-[70%] rounded-full"
                style={{
                  willChange: 'transform',
                  background:
                    'radial-gradient(ellipse at 45% 70%, rgba(20, 83, 45, 0.8) 0%, rgba(76, 29, 149, 0.65) 55%, transparent 85%)',
                }}
              />

              {/* 心音と同期して脈打つ紫黒色の毒ビネット */}
              <div
                className="absolute inset-0 border-[10px] border-purple-950/80 shadow-[inset_0_0_80px_rgba(88,28,135,0.9)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 急速換気（FAN）稼働中の天井ダクト吸引エフェクト（3秒間） */}
        <AnimatePresence>
          {isFanOn && (
            <motion.div
              key="rapid-fan-airflow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-25 pointer-events-none overflow-hidden"
            >
              {/* 上部排気ダクトへ吸い込まれる気流ライン */}
              <div className="absolute top-2 inset-x-0 flex justify-center">
                <div className="bg-emerald-950/90 border border-emerald-400/80 text-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                  <Wind className="w-3.5 h-3.5 text-emerald-300 animate-spin" style={{ animationDuration: '0.6s' }} />
                  <span>急速換気システム稼働中（天井ダクトへ強制排気）</span>
                </div>
              </div>
              {[18, 34, 50, 66, 82].map((leftPct, i) => (
                <motion.div
                  key={leftPct}
                  initial={{ y: 380, opacity: 0 }}
                  animate={{ y: -60, opacity: [0, 0.65, 0] }}
                  transition={{
                    duration: 0.45,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: 'linear',
                  }}
                  style={{ left: `${leftPct}%`, willChange: 'transform, opacity' }}
                  className="absolute w-0.5 h-28 bg-gradient-to-t from-transparent via-emerald-200/50 to-white/80"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* こじ開け発生時 または 2F管理室緊急警報時の車内非常警告光 */}
        <AnimatePresence>
          {(isPryingDoor || isKeyWomanAlertActive) && (
            <motion.div
              key="emergency-door-alert-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-25 pointer-events-none flex flex-col items-center justify-start p-2.5 md:p-3"
            >
              <div className="absolute inset-0 bg-red-950/45 door-emergency-light mix-blend-multiply" />
              {isKeyWomanAlertActive && (
                <div className="relative z-30 bg-red-950/95 border-2 border-red-500 text-red-100 px-3 py-1.5 md:px-3.5 md:py-2 rounded-xs shadow-[0_0_30px_rgba(220,38,38,0.95)] max-w-md w-full text-center font-mincho animate-pulse">
                  <div className="text-[10px] md:text-[11px] font-black text-amber-300 tracking-widest mb-0.5">
                    【管理室 最優先命令 // 特級危険物警報】
                  </div>
                  <div className="text-[11px] md:text-xs font-extrabold leading-snug">
                    2階の個体は特級危険物である。絶対に開けるな。直ちに扉を閉めろ。
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PREPARE（15F・10F・5F チェックポイント）時の業務指示書プレート */}
        {gameState === 'PREPARE' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 p-2.5 sm:p-4 overflow-y-auto overscroll-contain pointer-events-none">
            <div className="aged-paper border-2 border-stone-800 px-3.5 py-2.5 sm:px-5 sm:py-4 rounded-xs shadow-[0_15px_50px_rgba(0,0,0,0.98)] max-w-sm w-full font-mincho text-stone-900 relative shrink-0 pointer-events-auto">
              <div className="flex items-center justify-between border-b-2 border-stone-800 pb-1.5 sm:pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-stone-950 font-extrabold text-xs tracking-wider">
                  <ClipboardCheck className="w-4 h-4 text-red-900 shrink-0" />
                  <span>【{floor}階 検問待機所】管理室 通達</span>
                </div>
                <span className="border border-red-800 text-red-800 text-[10px] font-extrabold px-1.5 py-0.2 rotate-[-4deg] shrink-0">
                  絶対服従
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-900 leading-relaxed font-bold">
                {floor === 15
                  ? '保安通達（3通）をすべて確認しろ。確認完了後、操作盤の「▼ 検問開始（応答）」を押して15階の検問を開始しろ。'
                  : floor === 10
                  ? '管理室より規程改定の追加通達（2通）を下達した。未読通達を確認し、「▼ 検問開始（応答）」を押して10階の検問を開始しろ。'
                  : '管理室より低層階の追加通達（1通）を下達した。未読通達を確認し、「▼ 検問開始（応答）」を押して5階の検問を開始しろ。'}
              </p>
            </div>

            {/* 5Fのみ：管理室通達とは無関係に、扉の隙間から血に汚れた紙片が滑り込んでくる独立演出 */}
            {floor === 5 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                onClick={onOpenMemo}
                className="bloody-scrap-paper border-2 border-red-900/90 px-3.5 py-2 max-w-sm w-full text-left shadow-[0_8px_25px_rgba(127,29,29,0.75)] pointer-events-auto cursor-pointer hover:brightness-105 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] sm:text-xs font-mincho font-black text-red-950">
                    🩸 エレベーターの扉の隙間から、血に汚れた紙片が滑り込んできた……
                  </span>
                  <span className="shrink-0 bg-red-900 text-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded-xs animate-pulse">
                    確認
                  </span>
                </div>
              </motion.button>
            )}
          </div>
        )}

        {/* 到着ベル後に一瞬だけ金属扉に浮かび上がる階数表示演出 */}
        <AnimatePresence>
          {(gameState === 'ARRIVING' || gameState === 'FINAL_DOOR') && isArrivingFlash && (
            <motion.div
              key={`arriving-floor-${floor}`}
              style={{ willChange: 'transform, opacity' }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.06 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 z-25 pointer-events-none flex flex-col items-center justify-center select-none"
            >
              {/* 背後の暗赤・琥珀色のバックライト暈し（radial-gradientで軽量表現） */}
              <div
                className="absolute w-72 h-72 rounded-full"
                style={{
                  background:
                    floor <= 0
                      ? 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0.12) 40%, rgba(0,0,0,0) 70%)'
                      : currentVisitor?.category === 'ANOMALY' ||
                        (currentVisitor?.requiredCloseClicks ?? 1) > 1
                      ? 'radial-gradient(circle, rgba(220,38,38,0.42) 0%, rgba(220,38,38,0.1) 40%, rgba(0,0,0,0) 70%)'
                      : 'radial-gradient(circle, rgba(245,158,11,0.36) 0%, rgba(245,158,11,0.08) 40%, rgba(0,0,0,0) 70%)',
                }}
              />
              <div className="relative flex flex-col items-center">
                <span className="text-[11px] sm:text-xs font-mincho font-bold tracking-[0.4em] text-stone-400/90 mb-1">
                  {floor <= 0 ? '― 封鎖区域突破 ―' : '― 到着階層 ―'}
                </span>
                <span
                  className={`font-seven-seg text-6xl sm:text-7xl font-black tracking-widest ${
                    floor <= 0
                      ? 'text-sky-300'
                      : currentVisitor?.category === 'ANOMALY' ||
                        (currentVisitor?.requiredCloseClicks ?? 1) > 1
                      ? 'text-red-500'
                      : 'text-amber-400'
                  }`}
                  style={{
                    textShadow:
                      floor <= 0
                        ? '0 0 26px rgba(56,189,248,0.95)'
                        : currentVisitor?.category === 'ANOMALY' ||
                          (currentVisitor?.requiredCloseClicks ?? 1) > 1
                        ? '0 0 26px rgba(239,68,68,0.95)'
                        : '0 0 24px rgba(245,158,11,0.9)',
                  }}
                >
                  {floor <= 0 ? 'B1F' : `${String(floor).padStart(2, '0')}F`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 足元の敷居（シル） */}
        <div className="absolute bottom-0 inset-x-0 h-2.5 bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 border-t border-stone-600/50 z-25 opacity-75" />
      </div>
    </div>
  );
});
