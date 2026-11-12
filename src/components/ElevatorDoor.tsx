import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ClipboardCheck, Skull, Wind, BellRing, Eye } from 'lucide-react';
import type { GameState, MovingCabinEvent, VisitorData } from '../types/game';
import { VisitorView } from './VisitorView';

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
          className={`absolute top-0 bottom-0 left-0 w-1/2 metal-door-surface border-r-[4px] z-20 flex flex-col justify-center p-4 shadow-[14px_0_35px_rgba(0,0,0,0.95)] ${
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
          <div className="w-full h-3/5 border border-stone-800/45 bg-black/15 rounded-xs" />
          <div
            className={`absolute top-0 bottom-0 right-0 w-2.5 shadow-xl transition-colors ${
              isPryingDoor ? 'bg-red-800 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-stone-950'
            }`}
          />
        </motion.div>

        {/* 手前のレイヤー：右側の金属扉 */}
        <motion.div
          id="elevator-door-right"
          className={`absolute top-0 bottom-0 right-0 w-1/2 metal-door-surface border-l-[4px] z-20 flex flex-col justify-center p-4 shadow-[-14px_0_35px_rgba(0,0,0,0.95)] ${
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
          <div className="w-full h-3/5 border border-stone-800/45 bg-black/15 rounded-xs" />
          <div
            className={`absolute top-0 bottom-0 left-0 w-2.5 shadow-xl transition-colors ${
              isPryingDoor ? 'bg-red-800 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-stone-950'
            }`}
          />
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
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 pointer-events-none">
            <div className="aged-paper border-2 border-stone-800 px-5 py-4 rounded-xs shadow-[0_15px_50px_rgba(0,0,0,0.98)] max-w-sm w-full font-mincho text-stone-900 relative">
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
                  ? '左壁面ノ保安通達（三通）ヲ確認セヨ。査読完了後、右操作盤「▼ 下降開始」ニテ着務スベシ。'
                  : '管理室ヨリ規程改定ノ追加通達（二通）ガ届イテイル。左壁面ノ未読文書ヲ確認後、降下ヲ再開セヨ。'}
              </p>
            </div>
          </div>
        )}

        {/* 65%覗き込み変化（罠パターン／フェイク善良パターン）発生時の視覚アラート */}
        {gameState === 'JUDGING' &&
          isPeekTransformed &&
          currentVisitor?.peekTransformation &&
          !isPryingDoor && (
            <div className="absolute bottom-4 inset-x-3 z-30 flex flex-col items-center pointer-events-none">
              {currentVisitor.peekTransformation.type === 'REVEAL_THREAT' ? (
                <div className="bg-red-950/95 border-2 border-red-500 px-3.5 py-2 rounded-xs shadow-[0_0_28px_rgba(239,68,68,0.95)] flex items-center gap-2 animate-bounce font-mincho">
                  <Eye className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-black text-red-100 whitespace-nowrap">
                    【警告】偽装剥落・異形検知｜指ヲ離シ直チニ【閉扉】ニテ遮断セヨ
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-950/95 border-2 border-emerald-400 px-3.5 py-1.5 rounded-xs shadow-[0_0_20px_rgba(16,185,129,0.75)] flex items-center gap-2 font-mincho">
                  <Eye className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="text-xs font-bold text-emerald-100 whitespace-nowrap">
                    【照合】身元確認・正規住人｜全開ニテ乗車ヲ認可セヨ
                  </span>
                </div>
              )}
            </div>
          )}

        {/* 下降中（MOVING）の車内異変アラートバー（瘴気／鏡面怪異） */}
        {gameState === 'MOVING' && movingEvent && movingEvent.status === 'ACTIVE' && (
          <div className="absolute bottom-4 inset-x-3 z-30 flex flex-col items-center pointer-events-none">
            {movingEvent.type === 'MIASMA' && (
              <div className="bg-purple-950/95 border-2 border-purple-400 px-4 py-2 rounded-xs shadow-[0_0_30px_rgba(147,51,234,0.95)] flex flex-col items-center gap-1 font-mincho">
                <div className="flex items-center gap-2 text-purple-100 font-black text-xs sm:text-sm tracking-wider whitespace-nowrap">
                  <Wind className="w-4 h-4 text-emerald-300 animate-spin" />
                  <span>【車内汚染】有毒瘴気ノ充満検知！！</span>
                  <span className="font-seven-seg text-amber-300">
                    {(movingEvent.timeLeftMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <span className="text-[11px] text-purple-200 font-bold whitespace-nowrap">
                  右操作盤【急速換気】ニテ直チニ強制排気セヨ
                </span>
              </div>
            )}

            {movingEvent.type === 'MIRROR_GHOST' && (
              <div className="bg-red-950/95 border-2 border-red-500 px-4 py-2 rounded-xs shadow-[0_0_30px_rgba(239,68,68,0.95)] flex flex-col items-center gap-1 animate-bounce font-mincho">
                <div className="flex items-center gap-2 text-red-100 font-black text-xs sm:text-sm tracking-wider whitespace-nowrap">
                  <BellRing className="w-4 h-4 text-red-400 animate-ping" />
                  <span>【緊急警報】扉鏡面ニ背後怪異ノ影ヲ検知！！</span>
                  <span className="font-seven-seg text-amber-300">
                    {(movingEvent.timeLeftMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <span className="text-[11px] text-red-200 font-bold whitespace-nowrap">
                  右操作盤【非常ベル】ニテ直チニ緊急停止・強制排除セヨ
                </span>
              </div>
            )}
          </div>
        )}

        {/* こじ開け抵抗時の緊迫ホラーUI：ド派手な赤い警告バーと連打ゲージ */}
        {isPryingDoor && (
          <div className="absolute bottom-5 inset-x-2 z-30 flex flex-col items-center pointer-events-none animate-bounce font-mincho">
            <div className="bg-red-950 border-2 border-red-500 px-4 py-2 rounded-xs shadow-[0_0_30px_rgba(239,68,68,0.95)] flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-red-100 font-black text-xs sm:text-sm tracking-widest uppercase">
                <Skull className="w-4 h-4 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span>【扉破壊警報】異形ニヨル抉開侵入ヲ検知！！</span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>

              {/* 連打カウントダウンインジケーター */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-red-200 font-bold">
                  【閉扉】ヲ連打シテ押シ戻セ！
                </span>
                <div className="flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded-xs border border-red-700">
                  <span className="text-xs font-mono text-red-400">残</span>
                  <span className="text-base font-black font-seven-seg text-red-100 leading-none">
                    {closeClicksRemaining}
                  </span>
                  <span className="text-xs font-mono text-red-400">回</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 足元の敷居（シル） */}
        <div className="absolute bottom-0 inset-x-0 h-2.5 bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 border-t border-stone-600/50 z-25 opacity-75" />
      </div>
    </div>
  );
};
