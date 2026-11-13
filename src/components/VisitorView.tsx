import React from 'react';
import { motion } from 'framer-motion';
import type { VisitorData, GameState } from '../types/game';

interface VisitorViewProps {
  visitor: VisitorData | null;
  floor: number;
  gameState: GameState;
  doorOpenPercent: number;
  closeClicksRemaining?: number;
  isHoldingOpen?: boolean;
  isPeekTransformed?: boolean;
}

export const VisitorView: React.FC<VisitorViewProps> = ({
  visitor,
  floor,
  gameState,
  doorOpenPercent,
  closeClicksRemaining: _closeClicksRemaining,
  isHoldingOpen = false,
  isPeekTransformed = false,
}) => {
  const showVisitor =
    visitor &&
    (gameState === 'ARRIVING' || gameState === 'JUDGING' || gameState === 'EVENT_RESULT') &&
    doorOpenPercent > 2;
  // 65%を超えたか、一度でも65%変化がトリガーされた場合は変化後の外見を適用
  const threshold = visitor?.peekTransformation?.thresholdPercent ?? 65;
  const isTransformed = Boolean(
    visitor?.peekTransformation && (isPeekTransformed || doorOpenPercent >= threshold)
  );

  const effectiveAppearance =
    visitor && isTransformed && visitor.peekTransformation
      ? { ...visitor.appearance, ...visitor.peekTransformation.revealedAppearance }
      : visitor?.appearance;

  // 扉を初期隙間（12%）から広げて「覗き込んでいる」度合い (0.0 〜 1.0)
  const peekRatio = Math.max(0, Math.min(1, (doorOpenPercent - 12) / 60));

  // こじ開け怪異が扉を開くにつれてじわじわ近づいてくる比率 (0.0 〜 1.0)
  const isPryingVisitor = Boolean(visitor && visitor.requiredCloseClicks > 1);
  const pryApproachRatio = Math.max(0, Math.min(1, (doorOpenPercent - 12) / 88));

  const glitchClass =
    effectiveAppearance?.glitchLevel === 'HEAVY'
      ? 'glitch-heavy cctv-chromatic-heavy'
      : effectiveAppearance?.glitchLevel === 'SUBTLE'
      ? 'glitch-subtle cctv-chromatic-subtle'
      : '';

  const isNormalEndingView =
    floor >= 1 && (gameState === 'FINAL_DOOR' || gameState === 'CLEAR');
  const isTrueEndingView =
    floor <= 0 && (gameState === 'FINAL_DOOR' || gameState === 'CLEAR');

  return (
    <div className="relative w-full h-full bg-[#040504] overflow-hidden flex items-center justify-center">
      {/* ============================================================
          ★ 最終フロア演出①：1F 通常エンディング（合わせ鏡のような不気味な無限エレベーター箱内部）
          ============================================================ */}
      {isNormalEndingView ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#060605]">
          <svg
            viewBox="0 0 400 500"
            preserveAspectRatio="none"
            className="w-full h-full pointer-events-none"
          >
            <defs>
              <radialGradient id="infiniteMirrorAbyss" cx="50%" cy="48%" r="55%">
                <stop offset="0%" stopColor="#000000" />
                <stop offset="55%" stopColor="#0c0b09" />
                <stop offset="100%" stopColor="#1c1917" />
              </radialGradient>
              <linearGradient id="rustyWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1c1917" />
                <stop offset="50%" stopColor="#0f0e0d" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>
            </defs>

            {/* 背景ベース */}
            <rect x="0" y="0" width="400" height="500" fill="url(#infiniteMirrorAbyss)" />

            {/* 入れ子状に奥へ無限に続くエレベーターの箱（合わせ鏡構造 6段階） */}
            {[0, 1, 2, 3, 4, 5].map((depth) => {
              const scale = Math.pow(0.72, depth);
              const w = 380 * scale;
              const h = 470 * scale;
              const x = 200 - w / 2;
              const y = 245 - h / 2;
              const nextScale = Math.pow(0.72, depth + 1);
              const nw = 380 * nextScale;
              const nh = 470 * nextScale;
              const nx = 200 - nw / 2;
              const ny = 245 - nh / 2;

              return (
                <g key={depth} opacity={Math.max(0.18, 1 - depth * 0.14)}>
                  {/* パースライン（手前の枠から奥の枠へ繋がる金属天井・床・左右壁） */}
                  <line x1={x} y1={y} x2={nx} y2={ny} stroke="#44403c" strokeWidth="1.5" />
                  <line x1={x + w} y1={y} x2={nx + nw} y2={ny} stroke="#44403c" strokeWidth="1.5" />
                  <line x1={x} y1={y + h} x2={nx} y2={ny + nh} stroke="#292524" strokeWidth="1.5" />
                  <line x1={x + w} y1={y + h} x2={nx + nw} y2={ny + nh} stroke="#292524" strokeWidth="1.5" />

                  {/* エレベーター箱の外枠 */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="none"
                    stroke="#57534e"
                    strokeWidth={Math.max(1, 3.5 * scale)}
                  />

                  {/* 각箱の天井の薄暗い蛍光灯 */}
                  <rect
                    x={200 - 48 * scale}
                    y={y + 8 * scale}
                    width={96 * scale}
                    height={5 * scale}
                    rx={2 * scale}
                    fill="#fde68a"
                    opacity={0.55}
                  />

                  {/* 各箱の上部 7セグ階層表示（不気味に15F/1Fが灯る） */}
                  <rect
                    x={200 - 24 * scale}
                    y={y + 20 * scale}
                    width={48 * scale}
                    height={16 * scale}
                    fill="#09090b"
                    stroke="#78350f"
                    strokeWidth={scale}
                  />
                  <text
                    x="200"
                    y={y + 32 * scale}
                    textAnchor="middle"
                    fill={depth % 2 === 0 ? '#f59e0b' : '#ef4444'}
                    fontSize={11 * scale}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    15F
                  </text>

                  {/* 左壁の張り紙シルエット・右壁の操作盤シルエット */}
                  <rect
                    x={x + 6 * scale}
                    y={y + h * 0.25}
                    width={18 * scale}
                    height={h * 0.42}
                    fill="#292524"
                    stroke="#57534e"
                    strokeWidth={0.8 * scale}
                  />
                  <rect
                    x={x + w - 24 * scale}
                    y={y + h * 0.25}
                    width={18 * scale}
                    height={h * 0.42}
                    fill="#1c1917"
                    stroke="#57534e"
                    strokeWidth={0.8 * scale}
                  />
                  {/* 右壁操作盤の小さな赤・黄ランプ */}
                  <circle
                    cx={x + w - 15 * scale}
                    cy={y + h * 0.35}
                    r={2.8 * scale}
                    fill="#f59e0b"
                  />
                  <circle
                    cx={x + w - 15 * scale}
                    cy={y + h * 0.52}
                    r={2.8 * scale}
                    fill="#ef4444"
                  />
                </g>
              );
            })}

            {/* 最深部にぽつんと立ち尽くす「自分自身（作業員）」の黒い影 */}
            <g opacity="0.82">
              <ellipse cx="200" cy="236" rx="11" ry="13" fill="#050505" stroke="#44403c" strokeWidth="1" />
              <path
                d="M 180 288 L 185 252 C 188 245, 212 245, 215 252 L 220 288 Z"
                fill="#050505"
                stroke="#44403c"
                strokeWidth="1"
              />
              {/* 虚ろに光る2つの目 */}
              <circle cx="196" cy="235" r="1.2" fill="#f59e0b" opacity="0.8" />
              <circle cx="204" cy="235" r="1.2" fill="#f59e0b" opacity="0.8" />
            </g>
          </svg>

          {/* 不気味な案内プレート */}
          <div className="absolute top-6 inset-x-0 flex flex-col items-center pointer-events-none select-none">
            <div className="bg-stone-950/90 border border-amber-600/60 text-amber-400/90 px-3 py-1 text-xs font-mincho font-bold tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.9)]">
              第十五號昇降機 ― 同一規格ケージ接続
            </div>
          </div>
        </div>
      ) : isTrueEndingView ? (
        /* ============================================================
           ★ 最終フロア演出②：B1F トゥルーエンディング（地上へ続くコンクリートの非常階段と朝の光・青空）
           ============================================================ */
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#090d16]">
          <svg
            viewBox="0 0 400 500"
            preserveAspectRatio="none"
            className="w-full h-full pointer-events-none"
          >
            <defs>
              {/* 開いた鉄扉の向こうに広がる爽やかな朝の青空と黄金色の朝陽グラデーション */}
              <linearGradient id="morningSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="45%" stopColor="#38bdf8" />
                <stop offset="80%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>

              {/* 非常口から地下階段へ降り注ぐ眩しい朝の光（ゴッドレイ） */}
              <radialGradient id="morningSunGlow" cx="50%" cy="22%" r="65%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" />
                <stop offset="30%" stopColor="rgba(254, 249, 195, 0.85)" />
                <stop offset="65%" stopColor="rgba(186, 230, 253, 0.35)" />
                <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
              </radialGradient>

              <linearGradient id="sunbeamRay" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="50%" stopColor="rgba(254, 240, 138, 0.35)" />
                <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
              </linearGradient>

              <linearGradient id="concreteWallLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              <linearGradient id="concreteWallRight" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>

            {/* 1. 左右の地下コンクリート壁と天井 */}
            <polygon points="0,0 135,55 135,340 0,500" fill="url(#concreteWallLeft)" />
            <polygon points="400,0 265,55 265,340 400,500" fill="url(#concreteWallRight)" />
            <polygon points="0,0 400,0 265,55 135,55" fill="#334155" />

            {/* 2. 階段上の開け放たれた鉄扉枠と、その奥の眩しい青空 */}
            <rect
              x="135"
              y="55"
              width="130"
              height="185"
              fill="url(#morningSkyGrad)"
              stroke="#64748b"
              strokeWidth="4"
            />

            {/* 青空に浮かぶ朝の白い雲 */}
            <ellipse cx="175" cy="110" rx="28" ry="9" fill="#ffffff" opacity="0.88" />
            <ellipse cx="225" cy="92" rx="34" ry="11" fill="#ffffff" opacity="0.82" />
            <ellipse cx="200" cy="145" rx="45" ry="12" fill="#fef9c3" opacity="0.65" />

            {/* 奥へ押し開かれた重厚な非常鉄扉（左側に開いている立体描写） */}
            <polygon
              points="135,55 162,68 162,228 135,240"
              fill="#334155"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* 非常口の上の緑色の誘導灯 */}
            <rect x="176" y="34" width="48" height="14" rx="2" fill="#059669" stroke="#a7f3d0" strokeWidth="1.2" />
            <text x="200" y="44" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
              非常口 EXIT
            </text>

            {/* 3. 地上へと続くコンクリートの非常階段（下から上へ10段） */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => {
              const ratio = step / 10;
              const nextRatio = (step + 1) / 10;
              const yBottom = 490 - ratio * 250;
              const yTop = 490 - nextRatio * 250;
              const halfWBottom = 195 - ratio * 130;
              const halfWTop = 195 - nextRatio * 130;
              const brightness = Math.floor(70 + ratio * 145);
              const treadColor = `rgb(${brightness}, ${brightness + 8}, ${brightness + 18})`;
              const riserColor = `rgb(${Math.max(30, brightness - 35)}, ${Math.max(35, brightness - 28)}, ${Math.max(45, brightness - 18)})`;

              return (
                <g key={step}>
                  {/* 蹴込み板（段の垂直面） */}
                  <polygon
                    points={`${200 - halfWBottom},${yBottom} ${200 + halfWBottom},${yBottom} ${200 + halfWBottom},${yBottom - 11} ${200 - halfWBottom},${yBottom - 11}`}
                    fill={riserColor}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.7"
                  />
                  {/* 踏み面（朝の光を反射する水平面） */}
                  <polygon
                    points={`${200 - halfWBottom},${yBottom - 11} ${200 + halfWBottom},${yBottom - 11} ${200 + halfWTop},${yTop} ${200 - halfWTop},${yTop}`}
                    fill={treadColor}
                  />
                </g>
              );
            })}

            {/* 左右の金属製手すり */}
            <line x1="25" y1="430" x2="142" y2="215" stroke="#cbd5e1" strokeWidth="4" />
            <line x1="25" y1="430" x2="25" y2="485" stroke="#94a3b8" strokeWidth="3.5" />
            <line x1="90" y1="312" x2="90" y2="365" stroke="#94a3b8" strokeWidth="3" />

            <line x1="375" y1="430" x2="258" y2="215" stroke="#cbd5e1" strokeWidth="4" />
            <line x1="375" y1="430" x2="375" y2="485" stroke="#94a3b8" strokeWidth="3.5" />
            <line x1="310" y1="312" x2="310" y2="365" stroke="#94a3b8" strokeWidth="3" />

            {/* 4. 階段へ差し込む眩しい朝の光芒（ゴッドレイ） */}
            <polygon
              points="140,60 260,60 390,500 10,500"
              fill="url(#sunbeamRay)"
              style={{ mixBlendMode: 'screen' }}
            />
            <circle
              cx="200"
              cy="135"
              r="185"
              fill="url(#morningSunGlow)"
              opacity={0.55 + (doorOpenPercent / 100) * 0.45}
            />
          </svg>

          {/* 扉が開くにつれて強まる朝の光ブルーム */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.85) 0%, rgba(254,249,195,0.45) 42%, rgba(56,189,248,0.15) 80%, transparent 100%)',
              opacity: Math.max(0.15, (doorOpenPercent / 100) * 0.85),
            }}
          />
        </div>
      ) : (
        <>
          {/* 1. 奥の暗い廊下レイヤー */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 15%, rgba(160, 175, 140, 0.14) 0%, rgba(18, 22, 18, 0.78) 48%, rgba(3, 4, 3, 0.98) 90%)',
            }}
          />

          {/* 廊下の奥へ続く壁面パースライン */}
          <svg
            viewBox="0 0 400 500"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          >
            <defs>
              <linearGradient id="corridorDepth" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1c1f1b" />
                <stop offset="65%" stopColor="#090b09" />
                <stop offset="100%" stopColor="#020302" />
              </linearGradient>
            </defs>
            <rect
              x="95"
              y="55"
              width="210"
              height="340"
              fill="url(#corridorDepth)"
              stroke="#262925"
              strokeWidth="1"
            />
            <line x1="0" y1="0" x2="95" y2="55" stroke="#27272a" strokeWidth="1.5" />
            <line x1="400" y1="0" x2="305" y2="55" stroke="#27272a" strokeWidth="1.5" />
            <line x1="0" y1="500" x2="95" y2="395" stroke="#18181b" strokeWidth="1.5" />
            <line x1="400" y1="500" x2="305" y2="395" stroke="#18181b" strokeWidth="1.5" />
          </svg>

          {/* 廊下の天井蛍光灯 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-36 h-2 bg-amber-100/70 rounded-full blur-[2px] fluorescent-light shadow-[0_0_28px_rgba(220,240,190,0.45)]" />

          {/* 廊下奥の階数表示 */}
          <div className="absolute inset-x-10 top-8 bottom-10 flex flex-col items-center justify-between pointer-events-none opacity-65">
            <div className="mt-4 flex flex-col items-center select-none">
              <span className="font-seven-seg text-5xl text-stone-800/70 tracking-widest">
                {floor <= 0 ? 'B1F' : `${floor}F`}
              </span>
              {floor === 12 && (
                <div className="mt-1 bg-amber-500/20 border border-amber-500/50 text-amber-300/90 text-[10px] font-bold px-2 py-0.5 tracking-wider rotate-[-2deg] whitespace-nowrap">
                  12F 全面改装工事中（立入禁止）
                </div>
              )}
            </div>
            <div className="w-full h-14 bg-gradient-to-t from-black via-stone-950/80 to-transparent" />
          </div>
        </>
      )}

      {/* 2. 訪問者シルエット＆パーツ描画（65%覗き込みによる段階的変化対応） */}
      {!isNormalEndingView && !isTrueEndingView && showVisitor && visitor && effectiveAppearance && (
        <motion.div
          key={`${visitor.id}-${floor}`}
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{
            scale:
              gameState === 'EVENT_RESULT' && visitor.isThreat && doorOpenPercent >= 90
                ? 1.36
                : isPryingVisitor
                ? 1.0 + pryApproachRatio * 0.22
                : 1.0 + peekRatio * 0.05,
            opacity: 1,
            y: isPryingVisitor
              ? 8 * pryApproachRatio
              : isHoldingOpen
              ? -3 * peekRatio
              : 0,
          }}
          transition={{ duration: isPryingVisitor ? 0.12 : 0.3, ease: 'easeOut' }}
          className={`relative z-10 flex flex-col items-center justify-end h-[90%] w-80 pointer-events-none ${glitchClass}`}
        >
          {/* 静かな呼吸の揺れ */}
          <motion.div
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full h-full flex items-end justify-center"
          >
            {/*
              viewBox="0 0 280 380"（中央 X=140）
              - 初期12%の隙間では中央（顔の中心・首元・Vゾーン）のみが見える。
              - 左胸の名札（X=196〜218）や脇の荷物（X=54〜112）、凶器（X=46〜88）は
                扉を開いて覗き込むと現れる配置。
            */}
            <svg
              viewBox="0 0 280 380"
              className="w-full h-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.96)] overflow-visible"
            >
              <defs>
                <radialGradient id="headShadow" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="#292826" />
                  <stop offset="70%" stopColor="#141413" />
                  <stop offset="100%" stopColor="#050505" />
                </radialGradient>
                <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={effectiveAppearance.clothingColor} />
                  <stop offset="100%" stopColor="#070708" />
                </linearGradient>
                <filter id="redGlow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 傘（外側 X=204 に配置 → 扉を少し開くと見える） */}
              {effectiveAppearance.hasUmbrella && (
                <g transform="translate(204, 35) rotate(7)">
                  <line x1="0" y1="0" x2="0" y2="320" stroke="#1c1917" strokeWidth="5" />
                  <path
                    d="M -13 38 L 0 0 L 13 38 L 7 210 L -7 210 Z"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* 胴体・頭部シルエット */}
              <g
                transform={
                  effectiveAppearance.silhouetteType === 'HUNCHED'
                    ? 'translate(0, 26) scale(1.02, 0.92)'
                    : effectiveAppearance.silhouetteType === 'BROAD'
                    ? 'scale(1.12, 1) translate(-16, 0)'
                    : effectiveAppearance.silhouetteType === 'TALL_DISTORTED'
                    ? 'scale(0.94, 1.1) translate(8, -28)'
                    : ''
                }
              >
                {/* 外套・コート・制服 */}
                <path
                  d="M 52 380 L 68 172 C 72 144, 102 136, 140 136 C 178 136, 208 144, 212 172 L 228 380 Z"
                  fill="url(#coatGrad)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1.5"
                />

                {/* ★ 2Fの鍵となる女性（isKeyWoman）の薄汚れた白い服の煤・汚れディテール */}
                {visitor.isKeyWoman && (
                  <g opacity="0.55">
                    <ellipse cx="115" cy="235" rx="22" ry="38" fill="#57534e" />
                    <ellipse cx="165" cy="275" rx="26" ry="45" fill="#44403c" />
                    <ellipse cx="138" cy="188" rx="16" ry="12" fill="#78716c" />
                  </g>
                )}

                {/* 襟元（Vゾーン） */}
                <path
                  d="M 112 138 L 140 208 L 168 138"
                  fill="#121211"
                  stroke={effectiveAppearance.clothingColor}
                  strokeWidth="4"
                />
                <path
                  d="M 98 142 L 135 206 L 119 226 L 86 164 Z"
                  fill={effectiveAppearance.clothingColor}
                />
                <path
                  d="M 182 142 L 145 206 L 161 226 L 194 164 Z"
                  fill={effectiveAppearance.clothingColor}
                />

                {/* ★ 65%覗き込みで露呈する衣服の生々しい血痕（hasBloodStains === true） */}
                {effectiveAppearance.hasBloodStains && (
                  <g opacity="0.92">
                    <path
                      d="M 122 152 Q 140 175 156 158 L 164 218 Q 145 245 132 230 L 125 268 Q 118 240 115 195 Z"
                      fill="#7f1d1d"
                    />
                    <path
                      d="M 134 166 Q 146 184 152 172 L 155 242 Q 142 252 138 228 Z"
                      fill="#dc2626"
                      opacity="0.75"
                    />
                    <circle cx="106" cy="212" r="7" fill="#991b1b" />
                    <circle cx="114" cy="228" r="4.5" fill="#dc2626" />
                    <circle cx="168" cy="224" r="6" fill="#7f1d1d" />
                    <path
                      d="M 88 235 Q 98 265 92 310"
                      stroke="#991b1b"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                )}

                {/*
                  ★ 左胸の名札（X=196〜218, Y=184〜198）
                  初期12%の隙間では右扉の裏に完全に隠れて1ミリも見えず、
                  「開（OPEN）」を少し長押しして扉を20%以上に覗き込むとスッと現れる自然な配置
                */}
                {effectiveAppearance.hasNameTag ? (
                  <g
                    transform="translate(196, 184)"
                    opacity={doorOpenPercent <= 18 ? 0 : Math.min(1, (doorOpenPercent - 18) / 10)}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="22"
                      height="14"
                      rx="2"
                      fill="#f5f5f4"
                      stroke="#d97706"
                      strokeWidth="1.5"
                    />
                    <line x1="3" y1="5" x2="19" y2="5" stroke="#1c1917" strokeWidth="2" />
                    <line x1="3" y1="9" x2="14" y2="9" stroke="#57534e" strokeWidth="1.5" />
                  </g>
                ) : (
                  /* 名札がない配達員（帽子＋荷物ありで名札なし）が扉を広げて覗き込まれた時に見えるピン跡 */
                  effectiveAppearance.hasPackage && effectiveAppearance.hasCap && (
                    <g
                      transform="translate(198, 188)"
                      opacity={doorOpenPercent <= 18 ? 0 : Math.min(0.6, ((doorOpenPercent - 18) / 10) * 0.6)}
                    >
                      <circle cx="2" cy="0" r="1.5" fill="#000000" />
                      <circle cx="12" cy="0" r="1.5" fill="#000000" />
                      <line x1="2" y1="0" x2="12" y2="0" stroke="#1c1917" strokeWidth="1.2" />
                    </g>
                  )
                )}

                {/*
                  ★ 65%未満のフェイク善良住人用：暗がりで不気味な黒い塊に見える影（65%以上で段ボール箱と判明）
                */}
                {effectiveAppearance.isShadowedFace && (
                  <g opacity="0.9">
                    <path
                      d="M 46 225 Q 75 195 118 220 L 122 305 Q 75 315 48 290 Z"
                      fill="#09090b"
                      stroke="#27272a"
                      strokeWidth="1.5"
                    />
                    {/* 顔全体に落ちる不気味な濃い影 */}
                    <ellipse cx="140" cy="95" rx="44" ry="56" fill="rgba(0,0,0,0.68)" />
                  </g>
                )}

                {/*
                  ★ 手荷物・段ボール箱（X=54〜112, Y=244〜296）
                  扉を少し開いて覗き込むと全体が見える
                */}
                {effectiveAppearance.hasPackage && (
                  <g transform="translate(54, 244)">
                    <rect
                      x="0"
                      y="0"
                      width="58"
                      height="48"
                      rx="3"
                      fill="#78350f"
                      stroke="#d97706"
                      strokeWidth="1.5"
                    />
                    <line x1="0" y1="22" x2="58" y2="22" stroke="#b45309" strokeWidth="2.5" />
                    <rect x="10" y="6" width="18" height="10" rx="1" fill="#e7e5e4" opacity="0.85" />
                  </g>
                )}

                {/*
                  ★ 65%覗き込みで判明する隠していた凶器（血塗れの包丁・刃物）
                */}
                {effectiveAppearance.hasWeapon && (
                  <g transform="translate(58, 212) rotate(-22)" filter="url(#redGlow)">
                    {/* 握り手と柄 */}
                    <ellipse cx="22" cy="52" rx="11" ry="9" fill="#1c1917" />
                    <rect x="17" y="42" width="10" height="26" rx="2" fill="#292524" stroke="#78716c" strokeWidth="1" />
                    {/* 鋭い刃と鮮血 */}
                    <path
                      d="M 16 42 L 15 -28 C 15 -34, 28 -18, 30 42 Z"
                      fill="#e7e5e4"
                      stroke="#a8a29e"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 15 -28 C 19 -10, 22 15, 21 42 L 16 42 Z"
                      fill="#dc2626"
                    />
                    {/* 刃先から滴る血 */}
                    <circle cx="15" cy="-33" r="2.5" fill="#ef4444" />
                    <circle cx="14" cy="-42" r="1.8" fill="#dc2626" />
                  </g>
                )}

                {/* 首 */}
                <rect x="128" y="110" width="24" height="32" rx="6" fill="#171715" />

                {/* 頭部（シンプルで不気味なダークシルエット＋目と口が浮かび上がる表現） */}
                <g transform={`rotate(${effectiveAppearance.headTiltDeg ?? 0}, 140, 102)`}>
                  <ellipse
                    cx="140"
                    cy="82"
                    rx={effectiveAppearance.silhouetteType === 'TALL_DISTORTED' ? 32 : 36}
                    ry={effectiveAppearance.silhouetteType === 'TALL_DISTORTED' ? 49 : 45}
                    fill="url(#headShadow)"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.2"
                  />

                  {/* 制帽・作業帽（hasCap === true） */}
                  {effectiveAppearance.hasCap && (
                    <g transform="translate(20, 4)">
                      <path
                        d="M 82 52 L 88 24 C 100 16, 140 16, 152 24 L 158 52 Z"
                        fill={effectiveAppearance.clothingColor}
                        stroke="#d6d3d1"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M 78 50 Q 120 60 162 50 L 156 56 Q 120 65 84 56 Z"
                        fill="#09090b"
                        stroke="#78716c"
                        strokeWidth="1"
                      />
                      <circle cx="120" cy="38" r="4.5" fill="#fbbf24" />
                    </g>
                  )}

                  {/* 目のパーツ描画 */}
                  {/* 1. NORMAL: 通常の黒目＋はっきりした白いハイライト */}
                  {effectiveAppearance.eyeStyle === 'NORMAL' && (
                    <g>
                      <ellipse cx="125" cy="80" rx="6.5" ry="4.2" fill="#e7e5e4" />
                      <circle cx="125" cy="80" r="3.2" fill="#09090b" />
                      <circle cx="123.5" cy="78.5" r="1.5" fill="#ffffff" />

                      <ellipse cx="155" cy="80" rx="6.5" ry="4.2" fill="#e7e5e4" />
                      <circle cx="155" cy="80" r="3.2" fill="#09090b" />
                      <circle cx="153.5" cy="78.5" r="1.5" fill="#ffffff" />
                    </g>
                  )}

                  {/* 2. DEAD_DARK: 黒目が極端に小さく、ハイライトが一切ない偽物の目（張り紙⑤） */}
                  {effectiveAppearance.eyeStyle === 'DEAD_DARK' && (
                    <g>
                      <ellipse cx="125" cy="80" rx="7" ry="4.8" fill="#d6d3d1" />
                      <circle cx="125" cy="80" r="1.3" fill="#000000" />

                      <ellipse cx="155" cy="80" rx="7" ry="4.8" fill="#d6d3d1" />
                      <circle cx="155" cy="80" r="1.3" fill="#000000" />
                    </g>
                  )}

                  {/* 3. HOLLOW: 虚ろな黒い眼窩 */}
                  {effectiveAppearance.eyeStyle === 'HOLLOW' && (
                    <g>
                      <ellipse cx="125" cy="80" rx="7.5" ry="9" fill="#000000" />
                      <ellipse cx="155" cy="80" rx="7.5" ry="9" fill="#000000" />
                      {effectiveAppearance.hasBloodStains && (
                        <>
                          <path d="M 125 89 L 124 106" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" />
                          <path d="M 155 89 L 156 108" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" />
                        </>
                      )}
                    </g>
                  )}

                  {/* 4. GLOWING_RED: 赤く発光する怪異の目 */}
                  {effectiveAppearance.eyeStyle === 'GLOWING_RED' && (
                    <g filter="url(#redGlow)">
                      <ellipse cx="125" cy="80" rx="6.5" ry="4" fill="#ef4444" />
                      <circle cx="125" cy="80" r="2" fill="#fef2f2" />
                      <ellipse cx="155" cy="80" rx="6.5" ry="4" fill="#ef4444" />
                      <circle cx="155" cy="80" r="2" fill="#fef2f2" />
                    </g>
                  )}

                  {/* 5. MULTIPLE: 多眼 */}
                  {effectiveAppearance.eyeStyle === 'MULTIPLE' && (
                    <g filter="url(#redGlow)">
                      <circle cx="124" cy="72" r="4" fill="#dc2626" />
                      <circle cx="156" cy="72" r="4" fill="#dc2626" />
                      <circle cx="140" cy="60" r="5" fill="#ef4444" />
                      <circle cx="118" cy="86" r="3" fill="#f87171" />
                      <circle cx="162" cy="86" r="3" fill="#f87171" />
                    </g>
                  )}

                  {/* 口のパーツ描画 */}
                  {effectiveAppearance.mouthStyle === 'NEUTRAL' && (
                    <line
                      x1="132"
                      y1="104"
                      x2="148"
                      y2="104"
                      stroke="#a8a29e"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}

                  {effectiveAppearance.mouthStyle === 'SMILE' && (
                    <path
                      d="M 128 101 Q 140 111 152 101"
                      fill="none"
                      stroke="#d6d3d1"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  )}

                  {effectiveAppearance.mouthStyle === 'SMIRK' && (
                    <path
                      d="M 128 104 Q 140 109 153 99"
                      fill="none"
                      stroke="#a8a29e"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  )}

                  {effectiveAppearance.mouthStyle === 'JAGGED_GRIN' && (
                    <path
                      d="M 118 98 Q 140 120 162 98 Z"
                      fill="#450a0a"
                      stroke="#fca5a5"
                      strokeWidth="1.5"
                    />
                  )}

                  {effectiveAppearance.mouthStyle === 'OPEN_VOID' && (
                    <ellipse
                      cx="140"
                      cy="104"
                      rx="11"
                      ry="15"
                      fill="#000000"
                      stroke="#450a0a"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              </g>
            </svg>
          </motion.div>
        </motion.div>
      )}

      {/* 3. 隙間覗き込みの周辺減光（ビネット） */}
      <div
        className="absolute inset-0 z-15 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, transparent 35%, rgba(0, 0, 0, 0.72) 92%)',
        }}
      />
    </div>
  );
};
