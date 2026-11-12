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
}

export const ElevatorDoor: React.FC<ElevatorDoorProps> = ({
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
}) => {
  const slideOffsetPercent = Math.max(0, Math.min(100, doorOpenPercent)) * 0.92;

  const isPryingDoor =
    currentVisitor &&
    currentVisitor.requiredCloseClicks > 1 &&
    gameState === 'JUDGING' &&
    closeClicksRemaining > 0;

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
        className={`relative w-full h-full border-x-[12px] border-t-[8px] border-b-[12px] border-stone-900 shadow-[inset_0_0_50px_rgba(0,0,0,0.95)] overflow-hidden bg-black ${
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

        {/* 手前のレイヤー：左側の金属扉 */}
        <motion.div
          id="elevator-door-left"
          className={`absolute top-0 bottom-0 left-0 w-1/2 metal-door-surface border-r-[4px] z-20 flex flex-col justify-center overflow-visible shadow-[14px_0_35px_rgba(0,0,0,0.95)] ${
            isPryingDoor
              ? 'border-red-600 shadow-[14px_0_40px_rgba(220,38,38,0.6)]'
              : 'border-stone-950'
          }`}
          animate={{ x: `-${slideOffsetPercent}%` }}
          transition={{
            type: isHoldingOpen ? 'tween' : 'spring',
            duration: isHoldingOpen ? 0.06 : undefined,
            stiffness: 165,
            damping: 24,
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
        </motion.div>

        {/* 手前のレイヤー：右側の金属扉 */}
        <motion.div
          id="elevator-door-right"
          className={`absolute top-0 bottom-0 right-0 w-1/2 metal-door-surface border-l-[4px] z-20 flex flex-col justify-center overflow-visible shadow-[-14px_0_35px_rgba(0,0,0,0.95)] ${
            isPryingDoor
              ? 'border-red-600 shadow-[-14px_0_40px_rgba(220,38,38,0.6)]'
              : 'border-stone-950'
          }`}
          animate={{ x: `${slideOffsetPercent}%` }}
          transition={{
            type: isHoldingOpen ? 'tween' : 'spring',
            duration: isHoldingOpen ? 0.06 : undefined,
            stiffness: 165,
            damping: 24,
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
        </motion.div>

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
              {/* 車内の照明が赤黒く点滅するオーバーレイ */}
              <div className="absolute inset-0 cabin-red-black-flicker mix-blend-multiply" />

              {/* ステンレス扉表面の鏡面反射レイヤー（少しボヤッとした金属反射質感） */}
              <motion.div
                animate={
                  movingEvent.status === 'FAILED'
                    ? { scale: 2.35, y: 30, opacity: 1 }
                    : movingEvent.status === 'RESOLVED'
                    ? { scale: 0.7, opacity: 0, filter: 'blur(12px)' }
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
                  filter: movingEvent.status === 'FAILED' ? 'blur(0.3px)' : 'blur(1.4px)',
                  mixBlendMode: 'screen',
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

                  {/* プレイヤー自身のぼんやりした背面シルエット（手前中央下） */}
                  <g opacity="0.65">
                    <path
                      d="M 92 440 L 106 340 C 115 312, 205 312, 214 340 L 228 440 Z"
                      fill="#0c0a09"
                      stroke="rgba(168,162,158,0.18)"
                      strokeWidth="1.5"
                    />
                    <ellipse
                      cx="160"
                      cy="275"
                      rx="34"
                      ry="40"
                      fill="#0c0a09"
                      stroke="rgba(168,162,158,0.2)"
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* ★ プレイヤーの右肩越し（背後）に不気味に覗き込む怪異の巨大な影と顔 */}
                  <g transform="translate(212, 168) rotate(-16)">
                    {/* 怪異の歪んだ胴体・長い首 */}
                    <path
                      d="M -85 260 L -55 55 C -40 20, 40 20, 55 55 L 85 260 Z"
                      fill="rgba(15, 10, 12, 0.92)"
                      stroke="rgba(220, 38, 38, 0.35)"
                      strokeWidth="1.5"
                    />
                    {/* 蒼白く歪んだ顔輪郭（鏡面にボヤッと浮かぶ） */}
                    <ellipse
                      cx="0"
                      cy="-18"
                      rx="46"
                      ry="58"
                      fill="rgba(45, 35, 38, 0.88)"
                      stroke="rgba(248, 113, 113, 0.45)"
                      strokeWidth="1.8"
                    />
                    {/* 虚ろに大きく見開いた真っ黒な眼窩と赤い瞳孔 */}
                    <ellipse cx="-18" cy="-24" rx="11" ry="14" fill="#000000" />
                    <circle cx="-18" cy="-24" r="3.5" fill="#ef4444" />
                    <circle cx="-19" cy="-25" r="1.2" fill="#ffffff" />

                    <ellipse cx="18" cy="-24" rx="11" ry="14" fill="#000000" />
                    <circle cx="18" cy="-24" r="3.5" fill="#ef4444" />
                    <circle cx="17" cy="-25" r="1.2" fill="#ffffff" />

                    {/* 耳まで裂けた不気味な黒い笑み */}
                    <path
                      d="M -28 8 Q 0 38 28 8 Q 0 22 -28 8 Z"
                      fill="#000000"
                      stroke="#dc2626"
                      strokeWidth="1.8"
                    />
                    <line x1="-18" y1="14" x2="-18" y2="22" stroke="#fca5a5" strokeWidth="1.5" />
                    <line x1="-9" y1="16" x2="-9" y2="25" stroke="#fca5a5" strokeWidth="1.5" />
                    <line x1="0" y1="17" x2="0" y2="26" stroke="#fca5a5" strokeWidth="1.5" />
                    <line x1="9" y1="16" x2="9" y2="25" stroke="#fca5a5" strokeWidth="1.5" />
                    <line x1="18" y1="14" x2="18" y2="22" stroke="#fca5a5" strokeWidth="1.5" />
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
                        x2="360"
                        stroke="#7dd3fc"
                        strokeWidth="4"
                        initial={{ y1: 10, y2: 10 }}
                        animate={{ y1: 420, y2: 420 }}
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

              {/* うごめく瘴気のモヤ塊（複数レイヤー） */}
              <motion.div
                animate={{
                  x: [-18, 18, -12, 0],
                  y: [10, -25, 5, -15],
                  scale: [1, 1.12, 1.05, 1],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-12 inset-x-[-15%] h-[85%] rounded-full blur-2xl"
                style={{
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
                className="absolute bottom-0 inset-x-[-10%] h-[70%] rounded-full blur-xl"
                style={{
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
                  style={{ left: `${leftPct}%` }}
                  className="absolute w-0.5 h-28 bg-gradient-to-t from-transparent via-emerald-200/50 to-white/80 blur-[0.5px]"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* こじ開け発生時の車内非常警告光 */}
        <AnimatePresence>
          {isPryingDoor && (
            <div className="absolute inset-0 z-25 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-red-950/45 door-emergency-light mix-blend-multiply" />
            </div>
          )}
        </AnimatePresence>

        {/* PREPARE（15F・10F・5F チェックポイント）時の業務指示書プレート */}
        {gameState === 'PREPARE' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overscroll-contain pointer-events-none">
            <div className="aged-paper border-2 border-stone-800 px-4 py-3 sm:px-5 sm:py-4 rounded-xs shadow-[0_15px_50px_rgba(0,0,0,0.98)] max-w-sm w-full font-mincho text-stone-900 relative my-auto shrink-0 max-h-[85dvh] overflow-y-auto overscroll-contain touch-pan-y pointer-events-auto">
              <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-stone-950 font-extrabold text-xs tracking-wider">
                  <ClipboardCheck className="w-4 h-4 text-red-900 shrink-0" />
                  <span>【{floor}階 検問待機所】業務指示通達</span>
                </div>
                <span className="border border-red-800 text-red-800 text-[10px] font-extrabold px-1.5 py-0.2 rotate-[-4deg] shrink-0">
                  査読必須
                </span>
              </div>
              <p className="text-xs text-stone-900 leading-relaxed font-bold">
                {floor === 15
                  ? '左壁面の保安通達（3通）を確認してください。査読完了後、右操作盤の「▼ 下降開始」を押して着務してください。'
                  : '管理室より規程改定の追加通達（2通）が届いています。左壁面の未読文書を確認後、下降を再開してください。'}
              </p>
            </div>
          </div>
        )}

        {/* 到着ベル後に一瞬だけ金属扉に浮かび上がる階数表示演出 */}
        <AnimatePresence>
          {gameState === 'ARRIVING' && isArrivingFlash && (
            <motion.div
              key={`arriving-floor-${floor}`}
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 z-25 pointer-events-none flex flex-col items-center justify-center select-none"
            >
              {/* 背後の暗赤・琥珀色のバックライト暈し */}
              <div
                className="absolute w-64 h-64 rounded-full blur-2xl"
                style={{
                  background:
                    currentVisitor?.category === 'ANOMALY' ||
                    (currentVisitor?.requiredCloseClicks ?? 1) > 1
                      ? 'radial-gradient(circle, rgba(220,38,38,0.38) 0%, rgba(0,0,0,0) 70%)'
                      : 'radial-gradient(circle, rgba(245,158,11,0.32) 0%, rgba(0,0,0,0) 70%)',
                }}
              />
              <div className="relative flex flex-col items-center">
                <span className="text-[11px] sm:text-xs font-mincho font-bold tracking-[0.4em] text-stone-400/90 mb-1">
                  ― 到着階層 ―
                </span>
                <span
                  className={`font-seven-seg text-6xl sm:text-7xl font-black tracking-widest ${
                    currentVisitor?.category === 'ANOMALY' ||
                    (currentVisitor?.requiredCloseClicks ?? 1) > 1
                      ? 'text-red-500 drop-shadow-[0_0_28px_rgba(239,68,68,0.95)]'
                      : 'text-amber-400 drop-shadow-[0_0_26px_rgba(245,158,11,0.9)]'
                  }`}
                >
                  {String(floor).padStart(2, '0')}F
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
};
