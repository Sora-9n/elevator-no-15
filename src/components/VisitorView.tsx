import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { VisitorAppearance, VisitorData, GameState } from '../types/game';

interface VisitorViewProps {
  visitor: VisitorData | null;
  floor: number;
  gameState: GameState;
  doorOpenPercent: number;
  closeClicksRemaining?: number;
  isHoldingOpen?: boolean;
  isPeekTransformed?: boolean;
}

interface VisitorIllustrationProps {
  visitorId: string;
  appearance: VisitorAppearance;
  isKeyWoman: boolean;
  isNameTagVisible: boolean;
}

interface ColorPalette {
  base: string;
  mid: string;
  light: string;
  rim: string;
  shadow: string;
  deep: string;
  collar: string;
  tie?: string;
}

/**
 * 服装カラー（Hex）と属性から、キアロスクーロ（版画・影絵調）の多層カラーパレットを算出
 * 保安通達の識別条件（「青い服」「赤いコート」「白い服」等）が30%〜60%の隙間でも一目瞭然になるよう設計
 */
function resolveClothingPalette(color: string, isKeyWoman: boolean): ColorPalette {
  const c = color.toLowerCase();
  if (isKeyWoman || c === '#d6d3d1') {
    // 2F「鍵となる彼女」：薄汚れた白いワンピース・深い灰褐色のドレープ影
    return {
      base: '#9a948c',
      mid: '#b8b2a8',
      light: '#dcd7ce',
      rim: '#f5f2eb',
      shadow: '#272522',
      deep: '#0c0b0a',
      collar: '#d6d1c7',
    };
  }
  if (c === '#1d4ed8' || c === '#1e40af' || c === '#1e3a8a') {
    // 青い服・青い警備制服（通達①・④対象：隙間からでも即座に「青」と判別できる鮮明な群青ハイライト＋漆黒影）
    return {
      base: '#17367a',
      mid: '#1e469e',
      light: '#3b6ee8',
      rim: '#7ca7ff',
      shadow: '#0a1530',
      deep: '#060a17',
      collar: '#2554bd',
      tie: '#090d16',
    };
  }
  if (c === '#991b1b') {
    // 赤いコート（通達⑤対象：深紅のハイライト面と血黒色の落ち影）
    return {
      base: '#5c1111',
      mid: '#7f1818',
      light: '#b92525',
      rim: '#e04848',
      shadow: '#240707',
      deep: '#0f0404',
      collar: '#961c1c',
    };
  }
  if (c === '#18181b' || c === '#27272a') {
    // 濡れた黒い喪服・暗い影シルエット
    return {
      base: '#18191c',
      mid: '#24262b',
      light: '#3a3d45',
      rim: '#636875',
      shadow: '#0b0c0e',
      deep: '#050507',
      collar: '#2e3038',
    };
  }
  // 作業着・スーツ・灰褐色コート類（セピア・冷たい灰褐色の重厚なキアロスクーロ）
  return {
    base: '#32302d',
    mid: '#46423d',
    light: '#666058',
    rim: '#8f877b',
    shadow: '#171614',
    deep: '#0b0a09',
    collar: '#544f48',
    tie: '#291515',
  };
}

type HairArchetype =
  | 'KEY_WOMAN_LONG'
  | 'ANOMALY_WET_LONG'
  | 'FEMALE_COAT_BOB'
  | 'PARTED_NEAT'
  | 'MESSY_SHORT'
  | 'HOODED_HUNCH';

function resolveHairArchetype(
  visitorId: string,
  appearance: VisitorAppearance,
  isKeyWoman: boolean
): HairArchetype {
  if (isKeyWoman || visitorId === 'v-ch3-key-woman') return 'KEY_WOMAN_LONG';
  if (visitorId === 'v-any-neck-anomaly') return 'ANOMALY_WET_LONG';
  if (
    visitorId.includes('woman') ||
    visitorId.includes('red-coat') ||
    visitorId.includes('sick-fan')
  ) {
    return 'FEMALE_COAT_BOB';
  }
  if (
    appearance.silhouetteType === 'HUNCHED' &&
    appearance.isShadowedFace
  ) {
    return 'HOODED_HUNCH';
  }
  if (appearance.silhouetteType === 'SUIT') return 'PARTED_NEAT';
  return 'MESSY_SHORT';
}

const NormalEndingBackdrop = React.memo(() => {
  const mirrorLayers = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map((depth) => {
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
        return { depth, scale, w, h, x, y, nw, nh, nx, ny };
      }),
    []
  );

  return (
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
        </defs>

        {/* 背景ベース */}
        <rect x="0" y="0" width="400" height="500" fill="url(#infiniteMirrorAbyss)" />

        {/* 入れ子状に奥へ無限に続くエレベーターの箱（合わせ鏡構造 6段階） */}
        {mirrorLayers.map(({ depth, scale, w, h, x, y, nw, nh, nx, ny }) => (
          <g key={depth} opacity={Math.max(0.18, 1 - depth * 0.14)}>
            <line x1={x} y1={y} x2={nx} y2={ny} stroke="#44403c" strokeWidth="1.5" />
            <line x1={x + w} y1={y} x2={nx + nw} y2={ny} stroke="#44403c" strokeWidth="1.5" />
            <line x1={x} y1={y + h} x2={nx} y2={ny + nh} stroke="#292524" strokeWidth="1.5" />
            <line x1={x + w} y1={y + h} x2={nx + nw} y2={ny + nh} stroke="#292524" strokeWidth="1.5" />

            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke="#57534e"
              strokeWidth={Math.max(1, 3.5 * scale)}
            />

            <rect
              x={200 - 48 * scale}
              y={y + 8 * scale}
              width={96 * scale}
              height={5 * scale}
              rx={2 * scale}
              fill="#fde68a"
              opacity={0.55}
            />

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
            <circle cx={x + w - 15 * scale} cy={y + h * 0.35} r={2.8 * scale} fill="#f59e0b" />
            <circle cx={x + w - 15 * scale} cy={y + h * 0.52} r={2.8 * scale} fill="#ef4444" />
          </g>
        ))}

        {/* 最深部にぽつんと立ち尽くす「自分自身（作業員）」の版画調シルエット */}
        <g opacity="0.88">
          <path
            d="M 176 292 L 181 253 L 194 247 L 195 240 L 205 240 L 206 247 L 219 253 L 224 292 Z"
            fill="#070708"
            stroke="#57534e"
            strokeWidth="1"
          />
          <path
            d="M 190 226 C 190 218, 210 218, 210 226 C 211 235, 207 242, 200 243 C 193 242, 189 235, 190 226 Z"
            fill="#09090b"
            stroke="#57534e"
            strokeWidth="1"
          />
          <circle cx="196.5" cy="231" r="1.2" fill="#f59e0b" opacity="0.85" />
          <circle cx="203.5" cy="231" r="1.2" fill="#f59e0b" opacity="0.85" />
        </g>
      </svg>

      <div className="absolute top-6 inset-x-0 flex flex-col items-center pointer-events-none select-none">
        <div className="bg-stone-950/90 border border-amber-600/60 text-amber-400/90 px-3 py-1 text-xs font-mincho font-bold tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.9)]">
          第十五號昇降機 ― 同一規格ケージ接続
        </div>
      </div>
    </div>
  );
});

const TrueEndingStaticScene = React.memo(() => {
  const stairSteps = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => {
        const ratio = step / 10;
        const nextRatio = (step + 1) / 10;
        const yBottom = 490 - ratio * 250;
        const yTop = 490 - nextRatio * 250;
        const halfWBottom = 195 - ratio * 130;
        const halfWTop = 195 - nextRatio * 130;
        const brightness = Math.floor(70 + ratio * 145);
        const treadColor = `rgb(${brightness}, ${brightness + 8}, ${brightness + 18})`;
        const riserColor = `rgb(${Math.max(30, brightness - 35)}, ${Math.max(
          35,
          brightness - 28
        )}, ${Math.max(45, brightness - 18)})`;
        return {
          step,
          riserPoints: `${200 - halfWBottom},${yBottom} ${200 + halfWBottom},${yBottom} ${
            200 + halfWBottom
          },${yBottom - 11} ${200 - halfWBottom},${yBottom - 11}`,
          treadPoints: `${200 - halfWBottom},${yBottom - 11} ${200 + halfWBottom},${
            yBottom - 11
          } ${200 + halfWTop},${yTop} ${200 - halfWTop},${yTop}`,
          riserColor,
          treadColor,
        };
      }),
    []
  );

  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="none"
      className="w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id="morningSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="80%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>

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

      <polygon points="0,0 135,55 135,340 0,500" fill="url(#concreteWallLeft)" />
      <polygon points="400,0 265,55 265,340 400,500" fill="url(#concreteWallRight)" />
      <polygon points="0,0 400,0 265,55 135,55" fill="#334155" />

      <rect
        x="135"
        y="55"
        width="130"
        height="185"
        fill="url(#morningSkyGrad)"
        stroke="#64748b"
        strokeWidth="4"
      />

      <ellipse cx="175" cy="110" rx="28" ry="9" fill="#ffffff" opacity="0.88" />
      <ellipse cx="225" cy="92" rx="34" ry="11" fill="#ffffff" opacity="0.82" />
      <ellipse cx="200" cy="145" rx="45" ry="12" fill="#fef9c3" opacity="0.65" />

      <polygon
        points="135,55 162,68 162,228 135,240"
        fill="#334155"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      <rect
        x="176"
        y="34"
        width="48"
        height="14"
        rx="2"
        fill="#059669"
        stroke="#a7f3d0"
        strokeWidth="1.2"
      />
      <text x="200" y="44" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
        非常口 EXIT
      </text>

      {stairSteps.map(({ step, riserPoints, treadPoints, riserColor, treadColor }) => (
        <g key={step}>
          <polygon
            points={riserPoints}
            fill={riserColor}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.7"
          />
          <polygon points={treadPoints} fill={treadColor} />
        </g>
      ))}

      <line x1="25" y1="430" x2="142" y2="215" stroke="#cbd5e1" strokeWidth="4" />
      <line x1="25" y1="430" x2="25" y2="485" stroke="#94a3b8" strokeWidth="3.5" />
      <line x1="90" y1="312" x2="90" y2="365" stroke="#94a3b8" strokeWidth="3" />

      <line x1="375" y1="430" x2="258" y2="215" stroke="#cbd5e1" strokeWidth="4" />
      <line x1="375" y1="430" x2="375" y2="485" stroke="#94a3b8" strokeWidth="3.5" />
      <line x1="310" y1="312" x2="310" y2="365" stroke="#94a3b8" strokeWidth="3" />

      <polygon
        points="140,60 260,60 390,500 10,500"
        fill="url(#sunbeamRay)"
        style={{ mixBlendMode: 'screen' }}
      />
      <circle cx="200" cy="135" r="185" fill="url(#morningSunGlow)" opacity="0.85" />
    </svg>
  );
});

const CorridorBackdrop = React.memo<{ floor: number }>(({ floor }) => (
  <>
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 15%, rgba(160, 175, 140, 0.14) 0%, rgba(18, 22, 18, 0.78) 48%, rgba(3, 4, 3, 0.98) 90%)',
      }}
    />

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

    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-36 h-2 bg-amber-100/70 rounded-full fluorescent-light shadow-[0_0_28px_rgba(220,240,190,0.45)]" />

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
));

/**
 * ハイコントラスト・キアロスクーロ（版画・影絵調）訪問者ベクターイラスト
 * - 重いSVG filter（feGaussianBlur等）やCSS drop-shadowを一切排除
 * - 多層の<path>による骨格・鎖骨・喉仏の首接続、眼窩・鼻筋・頬骨の彫り、衣服のラペル・ドレープ・シワを描画
 */
const VisitorIllustrationSvg = React.memo<VisitorIllustrationProps>(
  ({ visitorId, appearance, isKeyWoman, isNameTagVisible }) => {
    const palette = useMemo(
      () => resolveClothingPalette(appearance.clothingColor, isKeyWoman),
      [appearance.clothingColor, isKeyWoman]
    );

    const hairType = useMemo(
      () => resolveHairArchetype(visitorId, appearance, isKeyWoman),
      [visitorId, appearance, isKeyWoman]
    );

    const isRedCoat = appearance.clothingColor.toLowerCase() === '#991b1b';
    const isBlueGuardOrCoat =
      appearance.clothingColor.toLowerCase() === '#1d4ed8' ||
      appearance.clothingColor.toLowerCase() === '#1e40af' ||
      appearance.clothingColor.toLowerCase() === '#1e3a8a';

    const bodyTransform = useMemo(() => {
      switch (appearance.silhouetteType) {
        case 'BROAD':
          return 'translate(-12, 6) scale(1.08, 0.98)';
        case 'HUNCHED':
          return 'translate(4, 24) rotate(4 140 240) scale(1.03, 0.93)';
        case 'TALL_DISTORTED':
          return 'translate(8, -22) scale(0.94, 1.09)';
        default:
          return undefined;
      }
    }, [appearance.silhouetteType]);

    const headTransform = useMemo(() => {
      const tilt = appearance.headTiltDeg ?? 0;
      const crouchY = appearance.silhouetteType === 'HUNCHED' ? 8 : 0;
      return `translate(0, ${crouchY}) rotate(${tilt} 140 120)`;
    }, [appearance.headTiltDeg, appearance.silhouetteType]);

    // 肌トーン（不気味なくすんだ青白い明部と深い影面）
    const skinLight = isKeyWoman
      ? '#cfc8be'
      : appearance.isShadowedFace
      ? '#3f3d3a'
      : appearance.eyeStyle === 'HOLLOW' || appearance.eyeStyle === 'GLOWING_RED'
      ? '#9e9a93'
      : '#b8b0a4';
    const skinMid = isKeyWoman
      ? '#8f887e'
      : appearance.isShadowedFace
      ? '#242321'
      : '#787167';
    const skinShadow = '#141316';
    const skinDeep = '#09090b';

    return (
      <svg
        viewBox="0 0 280 390"
        className="w-full h-full overflow-visible select-none"
      >
        <defs>
          {/* 廊下天井からのトップライトによるキアロスクーロ明暗グラデーション */}
          <linearGradient id="chiaroscuroRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e7e5e4" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#78716c" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0.9" />
          </linearGradient>

          {/* 2F「鍵となる彼女」背後の淡い月光オーラ（ブラーなしの軽量グラデーション） */}
          <radialGradient id="keyWomanBacklight" cx="50%" cy="34%" r="52%">
            <stop offset="0%" stopColor="rgba(226, 232, 240, 0.28)" />
            <stop offset="55%" stopColor="rgba(148, 163, 184, 0.09)" />
            <stop offset="100%" stopColor="rgba(9, 9, 11, 0)" />
          </radialGradient>

          {/* 怪異出現時の不穏な赤黒い背面ビネット */}
          <radialGradient id="anomalyBacklight" cx="50%" cy="32%" r="50%">
            <stop offset="0%" stopColor="rgba(185, 28, 28, 0.26)" />
            <stop offset="60%" stopColor="rgba(69, 10, 10, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        {/* 背面オーラ（2Fの彼女 または 異常個体） */}
        {isKeyWoman && (
          <ellipse cx="140" cy="148" rx="115" ry="145" fill="url(#keyWomanBacklight)" />
        )}
        {(appearance.glitchLevel === 'HEAVY' ||
          appearance.eyeStyle === 'GLOWING_RED' ||
          appearance.hasWeapon) && (
          <ellipse cx="140" cy="145" rx="118" ry="150" fill="url(#anomalyBacklight)" />
        )}

        <g transform={bodyTransform}>
          {/* ============================================================
              0. 背面長髪レイヤー（首・肩の後ろに落ちる髪の塊）
              ============================================================ */}
          {hairType === 'KEY_WOMAN_LONG' && (
            <g>
              {/* 背後に広がる乱れた黒髪のベース塊 */}
              <path
                d="M 96 68 C 80 96, 74 150, 70 228 C 84 222, 95 198, 104 168 L 176 168 C 185 198, 196 222, 210 228 C 206 150, 200 96, 184 68 Z"
                fill="#09090b"
                stroke="#27272a"
                strokeWidth="1"
              />
              {/* 髪の立体ハイライト束 */}
              <path
                d="M 92 84 C 83 122, 79 165, 76 212 C 82 186, 88 148, 96 112 Z"
                fill="#27272a"
              />
              <path
                d="M 188 84 C 195 122, 199 165, 202 210 C 194 182, 190 145, 183 112 Z"
                fill="#1f1f23"
              />
            </g>
          )}

          {hairType === 'ANOMALY_WET_LONG' && (
            <path
              d="M 94 64 C 78 104, 72 175, 66 262 L 82 245 L 92 185 L 188 185 L 198 248 L 214 262 C 208 175, 202 104, 186 64 Z"
              fill="#050507"
              stroke="#18181b"
              strokeWidth="1"
            />
          )}

          {hairType === 'FEMALE_COAT_BOB' && (
            <path
              d="M 95 66 C 84 92, 82 132, 88 158 C 98 164, 182 164, 192 158 C 198 132, 196 92, 185 66 Z"
              fill="#0c0a09"
              stroke="#292524"
              strokeWidth="1"
            />
          )}

          {hairType === 'HOODED_HUNCH' && (
            /* フード外郭の深いシルエット */
            <path
              d="M 84 148 C 78 96, 98 34, 140 32 C 182 34, 202 96, 196 148 Z"
              fill="#141416"
              stroke="#3f3f46"
              strokeWidth="1.4"
            />
          )}

          {/* ============================================================
              1. 傘（長身怪異などの背面〜肩越し小道具）
              ============================================================ */}
          {appearance.hasUmbrella && (
            <g transform="translate(202, 58) rotate(11)">
              {/* 傘の柄と骨組み */}
              <line x1="0" y1="0" x2="-16" y2="290" stroke="#52525b" strokeWidth="3.5" />
              <path
                d="M -68 28 C -25 -22, 32 -18, 66 34 C 34 22, -22 20, -68 28 Z"
                fill="#09090b"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
              {/* 閉じた黒いビニール傘の鋭いシワ影 */}
              <path
                d="M 0 -8 L -20 148 L -4 142 L 10 152 Z"
                fill="#111115"
                stroke="#3f3f46"
                strokeWidth="1"
              />
            </g>
          )}

          {/* ============================================================
              2. 首・鎖骨・喉仏の接続レイヤー（頭部の浮きを完全解消）
              ============================================================ */}
          <g>
            {/* 襟元の奥の深い闇（インナー・首の後ろ影） */}
            <path
              d="M 102 142 L 178 142 L 172 218 L 108 218 Z"
              fill="#070709"
            />

            {/* 首柱ベース（耳下から僧帽筋・鎖骨へ広がる自然な太さの首） */}
            <path
              d={
                appearance.silhouetteType === 'TALL_DISTORTED'
                  ? 'M 118 98 C 120 118, 114 138, 102 156 L 178 156 C 166 138, 160 118, 162 98 Z'
                  : 'M 116 106 C 117 124, 111 138, 98 152 L 182 152 C 169 138, 163 124, 164 106 Z'
              }
              fill={skinMid}
              stroke={skinDeep}
              strokeWidth="1.4"
            />

            {/* 首の左側ハイライト面（トップライトを受ける胸鎖乳突筋） */}
            <path
              d="M 118 108 C 119 125, 115 138, 106 150 L 134 156 L 136 112 Z"
              fill={skinLight}
              opacity="0.78"
            />

            {/* 首の右側〜顎下の濃いキアロスクーロ落ち影 */}
            <path
              d="M 122 108 C 132 122, 148 124, 163 108 C 164 125, 170 139, 180 151 L 138 158 C 138 136, 132 122, 122 108 Z"
              fill={skinShadow}
            />

            {/* 胸鎖乳突筋の筋スジ・喉仏（アダムの林檎）・鎖骨のくぼみ影 */}
            <path
              d="M 122 115 L 135 152 M 157 115 L 144 152"
              stroke={skinDeep}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* 喉仏の立体影 */}
            <path
              d="M 135 126 Q 140 132 145 126 Q 140 137 135 126 Z"
              fill={skinDeep}
              opacity="0.85"
            />
            {/* 鎖骨の水平シャドウと胸骨上窩（首の付け根のくぼみ） */}
            <path
              d="M 106 149 Q 126 156 140 159 Q 154 156 174 149"
              fill="none"
              stroke={skinDeep}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 110 147 Q 126 152 137 155 M 170 147 Q 154 152 143 155"
              fill="none"
              stroke={skinLight}
              strokeWidth="1.2"
              opacity="0.6"
            />

            {/* 異常個体：首の関節がズレた断層ライン */}
            {(appearance.headTiltDeg ?? 0) !== 0 && (
              <path
                d="M 114 124 L 166 131 L 162 136 L 116 129 Z"
                fill="#050507"
                stroke="#7f1d1d"
                strokeWidth="0.9"
              />
            )}
          </g>

          {/* ============================================================
              3. 胴体・肩・衣服の多層キアロスクーロベクター描画
              ============================================================ */}
          <g>
            {/* 3-A. 外套・スーツ・衣服のメインシルエット（なだらかな僧帽筋から肩・腕へ落ちる人間らしい骨格） */}
            <path
              d="M 98 144 C 76 150, 52 164, 42 194 C 33 226, 26 300, 22 390 L 258 390 C 254 300, 247 226, 238 194 C 228 164, 204 150, 182 144 L 166 154 C 154 166, 126 166, 114 154 Z"
              fill={palette.base}
              stroke={palette.deep}
              strokeWidth="2.2"
            />

            {/* 3-B. 左肩〜左胸の明部（廊下上方の照明を受けるハイライト面） */}
            <path
              d="M 98 145 C 76 151, 55 165, 45 194 C 37 224, 32 292, 28 388 L 128 388 L 132 168 L 112 152 Z"
              fill={palette.mid}
            />
            {/* 肩稜線と上腕のリムライト（くっきりした明暗境界） */}
            <path
              d="M 102 145 C 80 151, 58 164, 48 192 C 40 218, 35 268, 32 335 L 44 335 C 48 274, 52 224, 62 196 C 70 172, 86 158, 108 151 Z"
              fill={palette.light}
              opacity="0.88"
            />
            <path
              d="M 100 145 C 78 151, 56 164, 46 192 C 39 216, 35 258, 32 315"
              fill="none"
              stroke={palette.rim}
              strokeWidth="1.6"
              opacity="0.8"
            />

            {/* 3-C. 右肩〜右半身の深い漆黒の落ち影（キアロスクーロの核） */}
            <path
              d="M 144 162 L 168 152 L 182 144 C 204 150, 228 164, 238 194 C 247 226, 254 300, 258 390 L 142 390 Z"
              fill={palette.shadow}
            />
            <path
              d="M 188 148 C 210 156, 228 172, 236 202 L 254 390 L 196 390 C 198 300, 194 218, 182 176 Z"
              fill={palette.deep}
              opacity="0.82"
            />

            {/* 3-D. 服装タイプ別の襟・ラペル・ネクタイ・ドレープ描き込み */}
            {isKeyWoman ? (
              /* ★ 2F「鍵となる彼女」専用：薄汚れた白い服の深いドレープ影と鎖骨が開いた襟元 */
              <g>
                {/* 鎖骨が見える広く緩いネックライン */}
                <path
                  d="M 104 145 C 116 172, 164 172, 176 145 C 168 182, 112 182, 104 145 Z"
                  fill="#0c0b0a"
                  stroke={palette.light}
                  strokeWidth="1.4"
                />
                {/* 左胸〜裾へ流れる白い布のハイライト・ドレープ */}
                <path
                  d="M 92 154 C 104 195, 112 265, 106 388 L 128 388 C 130 270, 124 202, 112 164 Z"
                  fill={palette.light}
                  opacity="0.72"
                />
                <path
                  d="M 66 176 C 78 228, 82 295, 76 388 L 92 388 C 96 298, 92 228, 82 172 Z"
                  fill={palette.rim}
                  opacity="0.45"
                />
                {/* 幾重にも刻まれた深い布の縦シワ・落ち影 */}
                <path
                  d="M 108 168 C 116 225, 114 300, 108 388 L 116 388 C 122 300, 122 225, 114 168 Z"
                  fill={palette.shadow}
                />
                <path
                  d="M 136 172 C 138 235, 134 310, 130 388 L 146 388 C 148 308, 148 232, 142 172 Z"
                  fill={palette.deep}
                  opacity="0.88"
                />
                <path
                  d="M 162 166 C 170 228, 176 302, 182 388 L 194 388 C 186 298, 180 224, 170 162 Z"
                  fill={palette.deep}
                />
                {/* 薄汚れた裾・胸元の煤汚れ（ソリッドベクター斑） */}
                <path
                  d="M 74 252 C 88 248, 96 262, 84 274 C 72 270, 68 258, 74 252 Z"
                  fill="#44403c"
                  opacity="0.45"
                />
                <path
                  d="M 118 295 C 134 288, 144 308, 128 322 C 114 318, 110 304, 118 295 Z"
                  fill="#292524"
                  opacity="0.5"
                />
              </g>
            ) : appearance.silhouetteType === 'SUIT' || isBlueGuardOrCoat ? (
              /* ★ スーツ / 青い警備制服・青コート：シャープなVゾーン・ワイシャツ・ネクタイ・ラペル */
              <g>
                {/* Vゾーン内の白いシャツと影 */}
                <polygon
                  points="114,148 166,148 140,236"
                  fill="#d6d3d1"
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
                <polygon points="140,148 166,148 140,236" fill="#78716c" />
                {/* シャツの襟 */}
                <polygon
                  points="113,144 138,166 124,180 108,154"
                  fill="#f5f5f4"
                  stroke="#27272a"
                  strokeWidth="1.2"
                />
                <polygon
                  points="167,144 142,166 156,180 172,154"
                  fill="#a8a29e"
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
                {/* ネクタイ（結び目と剣先） */}
                <polygon
                  points="134,164 146,164 143,177 137,177"
                  fill={palette.tie ?? '#1e1b4b'}
                  stroke="#09090b"
                  strokeWidth="1"
                />
                <polygon
                  points="137,177 143,177 147,232 140,244 133,232"
                  fill={palette.tie ?? '#1e1b4b'}
                  stroke="#09090b"
                  strokeWidth="1"
                />
                {/* 左ラペル（明部：青い服やスーツの色が隙間からくっきり見える大きな襟） */}
                <path
                  d="M 96 144 L 115 148 L 140 242 L 106 232 L 86 184 L 98 174 L 88 162 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                {/* 右ラペル（暗部） */}
                <path
                  d="M 184 144 L 165 148 L 140 242 L 174 232 L 194 184 L 182 174 L 192 162 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                {/* 警備制服の肩章（エポーレット） */}
                {isBlueGuardOrCoat && appearance.hasCap && (
                  <g>
                    <polygon
                      points="58,166 96,148 102,157 62,176"
                      fill={palette.rim}
                      stroke="#09090b"
                      strokeWidth="1.3"
                    />
                    <circle cx="93" cy="154" r="2.5" fill="#fbbf24" />
                    <polygon
                      points="222,166 184,148 178,157 218,176"
                      fill={palette.light}
                      stroke="#09090b"
                      strokeWidth="1.3"
                    />
                    <circle cx="187" cy="154" r="2.5" fill="#d97706" />
                  </g>
                )}
                {/* フロント合わせ目とボタン */}
                <line x1="140" y1="242" x2="140" y2="390" stroke="#09090b" strokeWidth="2.5" />
                <circle cx="134" cy="264" r="3" fill="#09090b" stroke={palette.rim} strokeWidth="0.8" />
                <circle cx="134" cy="298" r="3" fill="#09090b" stroke={palette.rim} strokeWidth="0.8" />
              </g>
            ) : isRedCoat ? (
              /* ★ 赤いコート（通達⑤対象：隙間からでも赤いトレンチコートと即座に判別できる大きな襟と合わせ目） */
              <g>
                {/* 首元の黒タートルインナー */}
                <path d="M 114 146 L 166 146 L 140 208 Z" fill="#09090b" />
                {/* 大きく立ち上がった赤いコートの左襟（鮮明な深紅ハイライト） */}
                <path
                  d="M 88 136 L 116 144 L 142 232 L 98 218 L 76 174 L 92 162 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="2"
                />
                <path
                  d="M 90 138 L 114 145 L 136 220"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="1.6"
                />
                {/* 赤いコートの右襟 */}
                <path
                  d="M 192 136 L 164 144 L 132 232 L 182 218 L 204 174 L 188 162 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="2"
                />
                {/* ダブルブレストのコート合わせ目と飾りボタン */}
                <line x1="130" y1="228" x2="124" y2="390" stroke="#09090b" strokeWidth="2.4" />
                <circle cx="116" cy="246" r="3.5" fill="#1c1917" stroke="#fca5a5" strokeWidth="1" />
                <circle cx="114" cy="282" r="3.5" fill="#1c1917" stroke="#fca5a5" strokeWidth="1" />
                <circle cx="152" cy="246" r="3.5" fill="#09090b" stroke="#7f1d1d" strokeWidth="1" />
                <circle cx="150" cy="282" r="3.5" fill="#09090b" stroke="#7f1d1d" strokeWidth="1" />
              </g>
            ) : (
              /* ★ 作業着・普段着・部屋着・コート（ファスナー襟や緩い襟元とリアルな布シワ） */
              <g>
                {/* インナーTシャツの丸首 */}
                <path
                  d="M 114 148 Q 140 168 166 148 L 154 192 L 126 192 Z"
                  fill="#1c1917"
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                {/* 作業着・ジャケットの折り返し襟 */}
                <path
                  d="M 94 140 L 116 146 L 136 210 L 98 196 L 84 164 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 186 140 L 164 146 L 144 210 L 182 196 L 196 164 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                {/* フロントジッパーライン */}
                <line x1="140" y1="192" x2="140" y2="390" stroke="#09090b" strokeWidth="2.6" />
                <line x1="137" y1="196" x2="137" y2="388" stroke={palette.rim} strokeWidth="0.9" opacity="0.55" />
              </g>
            )}

            {/* 3-E. 脇下・肘・胸元の立体的な布シワ（全服装共通の版画調シャドウパス） */}
            <path
              d="M 68 198 C 76 232, 74 285, 62 355 L 72 355 C 82 288, 84 234, 74 198 Z"
              fill={palette.deep}
              opacity="0.82"
            />
            <path
              d="M 212 198 C 204 232, 206 285, 218 355 L 208 355 C 198 288, 196 234, 206 198 Z"
              fill={palette.deep}
              opacity="0.9"
            />
            <path
              d="M 78 228 L 106 254 L 82 246 Z M 202 224 L 168 252 L 196 244 Z"
              fill={palette.deep}
              opacity="0.72"
            />

            {/* ★ 65%覗き込みで判明する衣服の大量の血痕（シャープな飛沫ベクター） */}
            {appearance.hasBloodStains && (
              <g opacity="0.92">
                <path
                  d="M 110 176 C 122 172, 148 182, 154 205 C 160 226, 144 252, 134 278 C 126 254, 130 228, 116 212 C 104 198, 102 182, 110 176 Z"
                  fill="#7f1d1d"
                />
                <path
                  d="M 122 188 C 132 186, 146 196, 144 218 L 138 265 L 132 230 L 122 252 L 120 210 Z"
                  fill="#dc2626"
                />
                <path
                  d="M 88 225 C 96 220, 108 232, 102 248 L 96 286 L 90 250 Z"
                  fill="#991b1b"
                />
                <circle cx="156" cy="238" r="5" fill="#991b1b" />
                <circle cx="164" cy="252" r="3" fill="#dc2626" />
              </g>
            )}

            {/* ============================================================
                3-F. 胸元の名札・IDカード（ネックストラップ＋金属クリップ＋顔写真枠）
                扉を30%〜50%開けた隙間からでも確実に見える中央寄りの胸位置（x=148〜184）に配置
                ============================================================ */}
            {appearance.hasNameTag && isNameTagVisible && (
              <g>
                {/* 首元からカードへ繋がるネックストラップ紐 */}
                <path
                  d="M 114 148 L 164 202 L 169 202 L 168 148"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.2"
                  opacity="0.9"
                />
                {/* 金属クリップ */}
                <rect
                  x="161"
                  y="197"
                  width="10"
                  height="8"
                  rx="1"
                  fill="#d6d3d1"
                  stroke="#09090b"
                  strokeWidth="1"
                />
                {/* IDカードの落ち影 */}
                <rect
                  x="148"
                  y="206"
                  width="38"
                  height="26"
                  rx="2"
                  fill="#050507"
                />
                {/* IDカード本体（高コントラストなクリーム白＋アンバー枠） */}
                <rect
                  x="146"
                  y="204"
                  width="38"
                  height="26"
                  rx="2"
                  fill="#f5f5f4"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                {/* カード上部の所属帯 */}
                <rect x="147" y="205" width="36" height="5" fill="#b45309" />
                {/* 証明写真の小枠 */}
                <rect x="150" y="213" width="9" height="12" fill="#292524" />
                <circle cx="154.5" cy="217" r="2.2" fill="#a8a29e" />
                <path d="M 151 224 C 152 220, 157 220, 158 224 Z" fill="#78716c" />
                {/* 氏名・バーコード線 */}
                <line x1="162" y1="215" x2="180" y2="215" stroke="#1c1917" strokeWidth="2.2" />
                <line x1="162" y1="220" x2="177" y2="220" stroke="#57534e" strokeWidth="1.6" />
                <line x1="162" y1="224" x2="179" y2="224" stroke="#78716c" strokeWidth="1.4" />
              </g>
            )}

            {/* ============================================================
                3-G. 配達員の段ボール荷物 ＆ それを抱える腕・指のシルエット
                ============================================================ */}
            {appearance.hasPackage && (
              <g transform="translate(52, 232)">
                {/* 荷物の下の濃い落ち影 */}
                <polygon points="6,10 124,6 128,84 4,88" fill="#070709" />
                {/* 段ボール箱の正面（明部）と側面（暗部） */}
                <polygon
                  points="0,4 94,0 94,74 0,78"
                  fill="#854d0e"
                  stroke="#1c1917"
                  strokeWidth="2"
                />
                <polygon
                  points="94,0 122,8 122,80 94,74"
                  fill="#451a03"
                  stroke="#1c1917"
                  strokeWidth="2"
                />
                {/* ガムテープと配送伝票ラベル */}
                <polygon points="0,34 94,30 122,38 122,45 94,37 0,41" fill="#b45309" />
                <rect
                  x="14"
                  y="10"
                  width="32"
                  height="16"
                  rx="1"
                  fill="#e7e5e4"
                  stroke="#292524"
                  strokeWidth="1"
                />
                <line x1="18" y1="15" x2="40" y2="15" stroke="#1c1917" strokeWidth="2" />
                <line x1="18" y1="20" x2="34" y2="20" stroke="#dc2626" strokeWidth="1.5" />
                {/* 箱を両脇から支える作業手袋の指 */}
                <path
                  d="M -8 36 C -2 30, 12 32, 16 40 C 12 48, -2 50, -8 46 Z"
                  fill="#292524"
                  stroke="#09090b"
                  strokeWidth="1.5"
                />
                <path
                  d="M 112 40 C 118 34, 130 36, 132 46 C 128 54, 116 54, 112 48 Z"
                  fill="#1c1917"
                  stroke="#09090b"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* ============================================================
                3-H. 65%覗き込みで露呈する血塗れの凶器（包丁と握り込む骨張った拳）
                ============================================================ */}
            {appearance.hasWeapon && (
              <g transform="translate(50, 206) rotate(-18)">
                {/* 刃の背後の赤い殺気ハロー（ブラーなしのソリッド半透明ポリゴン） */}
                <polygon
                  points="10,48 6,-48 26,-26 36,48"
                  fill="#dc2626"
                  opacity="0.24"
                />
                {/* 柳刃・文化包丁の鋭利なブレード（鋼の明部と血の暗部） */}
                <path
                  d="M 15 44 L 12 -42 C 22 -28, 30 -4, 31 44 Z"
                  fill="#d6d3d1"
                  stroke="#18181b"
                  strokeWidth="1.6"
                />
                <path
                  d="M 15 44 L 12 -42 L 19 -18 L 20 44 Z"
                  fill="#f5f5f4"
                />
                {/* 刃先にべっとり付着した鮮血 */}
                <path
                  d="M 12 -42 C 18 -24, 24 4, 22 38 L 15 38 Z"
                  fill="#991b1b"
                />
                <path
                  d="M 12 -42 C 16 -26, 19 -6, 18 22 L 14 22 Z"
                  fill="#ef4444"
                />
                {/* 柄（ハンドル）と鍔 */}
                <rect x="13" y="42" width="18" height="6" fill="#52525b" stroke="#09090b" strokeWidth="1.2" />
                <rect x="15" y="48" width="12" height="32" rx="2" fill="#1c1917" stroke="#09090b" strokeWidth="1.4" />
                {/* 包丁を強く握りしめる節くれだった指 */}
                <path
                  d="M 8 52 C 8 46, 30 46, 30 53 C 30 66, 28 74, 14 74 C 8 72, 8 60, 8 52 Z"
                  fill={skinMid}
                  stroke={skinDeep}
                  strokeWidth="1.6"
                />
                <line x1="11" y1="57" x2="28" y2="57" stroke={skinDeep} strokeWidth="1.4" />
                <line x1="11" y1="63" x2="28" y2="63" stroke={skinDeep} strokeWidth="1.4" />
                <line x1="12" y1="69" x2="27" y2="69" stroke={skinDeep} strokeWidth="1.4" />
                {/* 刃先から滴る血の雫 */}
                <path d="M 12 -44 L 10 -54 L 14 -54 Z" fill="#ef4444" />
                <circle cx="12" cy="-58" r="2.2" fill="#dc2626" />
              </g>
            )}
          </g>

          {/* ============================================================
              4. 頭部・彫刻的顔面陰影・髪型・帽子のベクター描画
              ============================================================ */}
          <g transform={headTransform}>
            {/* 4-A. 左右の耳（側頭骨から顎へ繋がるリアルな耳介と耳穴影） */}
            <g>
              {/* 左耳（明部側） */}
              <path
                d="M 103 74 C 95 72, 93 84, 96 93 C 98 99, 103 101, 106 98 Z"
                fill={skinMid}
                stroke={skinDeep}
                strokeWidth="1.4"
              />
              <path d="M 98 80 C 97 85, 98 91, 102 93" fill="none" stroke={skinDeep} strokeWidth="1.4" />
              {/* 右耳（暗部側） */}
              <path
                d="M 177 74 C 185 72, 187 84, 184 93 C 182 99, 177 101, 174 98 Z"
                fill={skinShadow}
                stroke={skinDeep}
                strokeWidth="1.4"
              />
            </g>

            {/* 4-B. 頭蓋・頬骨・エラ・顎先の骨格シルエット（単純な楕円を廃止） */}
            <path
              d={
                isKeyWoman
                  ? /* 女性的な細くシャープな顎と頬骨 */
                    'M 140 34 C 112 34, 101 54, 103 78 C 104 92, 107 103, 114 113 C 122 122, 133 128, 140 129 C 147 128, 158 122, 166 113 C 173 103, 176 92, 177 78 C 179 54, 168 34, 140 34 Z'
                  : appearance.silhouetteType === 'BROAD'
                  ? /* がっしりした角張ったエラと顎 */
                    'M 140 34 C 110 34, 99 52, 101 78 C 102 94, 104 108, 112 117 C 121 125, 131 129, 140 129 C 149 129, 159 125, 168 117 C 176 108, 178 94, 179 78 C 181 52, 170 34, 140 34 Z'
                  : /* 彫りの深いこけた頬と骨格的な顎ライン */
                    'M 140 33 C 111 33, 101 53, 102 78 C 103 92, 106 105, 113 115 C 121 124, 132 129, 140 130 C 148 129, 159 124, 167 115 C 174 105, 177 92, 178 78 C 179 53, 169 33, 140 33 Z'
              }
              fill={skinLight}
              stroke={skinDeep}
              strokeWidth="1.8"
            />

            {/* 4-C. 顔面キアロスクーロ：右半分・こけた頬・顎下を覆う深い版画調の影面 */}
            <path
              d="M 140 34 C 143 52, 142 74, 144 92 C 138 96, 136 103, 140 110 C 137 117, 134 124, 138 130 C 147 129, 159 124, 167 115 C 174 105, 177 92, 178 78 C 179 53, 169 34, 140 34 Z"
              fill={skinMid}
            />
            {/* さらに深い右頬〜顎側面の漆黒シャドウ */}
            <path
              d="M 154 40 C 164 56, 166 78, 162 96 C 156 108, 148 118, 138 130 C 148 129, 159 124, 167 115 C 174 105, 177 92, 178 78 C 179 56, 170 42, 154 40 Z"
              fill={skinShadow}
              opacity="0.9"
            />

            {/* 左頬のコケ影（頬骨の下に落ちる三角形の彫り影） */}
            <path
              d="M 106 88 C 114 91, 121 96, 122 106 C 116 109, 111 104, 106 88 Z"
              fill={skinMid}
              opacity="0.82"
            />
            <path
              d="M 108 92 C 114 95, 118 99, 119 105"
              fill="none"
              stroke={skinShadow}
              strokeWidth="1.3"
              opacity="0.7"
            />

            {/* 額のシワ・眉間の縦ジワ */}
            {!isKeyWoman && (
              <g opacity="0.65">
                <path d="M 121 58 Q 140 55 159 58" fill="none" stroke={skinShadow} strokeWidth="1.2" />
                <path d="M 125 63 Q 140 61 155 63" fill="none" stroke={skinShadow} strokeWidth="1" />
                <line x1="137" y1="66" x2="136" y2="74" stroke={skinDeep} strokeWidth="1.4" />
                <line x1="143" y1="66" x2="144" y2="74" stroke={skinDeep} strokeWidth="1.4" />
              </g>
            )}

            {/* 65%未満で顔が暗い影に沈んでいる演出（REVEAL_INNOCENTの初期状態など） */}
            {appearance.isShadowedFace && (
              <path
                d="M 101 34 L 179 34 L 178 108 Q 140 122 102 108 Z"
                fill="#09090b"
                opacity="0.84"
              />
            )}

            {/* 4-D. 鼻梁（鼻筋のハイライトと小鼻の強い落ち影） */}
            <g>
              {/* 鼻筋の明部ポリゴン */}
              <polygon
                points="139,73 135,95 140,97 141,73"
                fill="#e7e5e4"
                opacity={appearance.isShadowedFace ? 0.25 : 0.72}
              />
              {/* 鼻の右側面と鼻下の濃い影 */}
              <path
                d="M 141 73 L 147 94 L 140 99 L 133 96 L 135 94 L 140 96 Z"
                fill={skinDeep}
              />
              {/* 人中（鼻の下の溝） */}
              <line x1="140" y1="99" x2="140" y2="105" stroke={skinDeep} strokeWidth="1.5" />
            </g>

            {/* 4-E. 深くくぼんだ眼窩（アイソケット）と眉の影 */}
            <g>
              {/* 左眼窩の彫り影 */}
              <path
                d="M 111 74 C 116 69, 131 70, 135 76 C 134 84, 129 88, 122 88 C 114 88, 110 82, 111 74 Z"
                fill={skinDeep}
                opacity="0.88"
              />
              {/* 右眼窩の彫り影 */}
              <path
                d="M 145 76 C 149 70, 164 69, 169 74 C 170 82, 166 88, 158 88 C 151 88, 146 84, 145 76 Z"
                fill={skinDeep}
                opacity="0.92"
              />
              {/* 眉のシルエット（2Fの彼女は悲しげに八の字に傾いた眉、他は険しい眉） */}
              {isKeyWoman ? (
                <g>
                  <path
                    d="M 112 73 Q 123 70 133 66"
                    fill="none"
                    stroke="#09090b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 147 66 Q 157 70 168 73"
                    fill="none"
                    stroke="#09090b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                <g>
                  <path
                    d="M 110 70 L 124 68 L 135 72"
                    fill="none"
                    stroke="#09090b"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 145 72 L 156 68 L 170 70"
                    fill="none"
                    stroke="#09090b"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>

            {/* 4-F. 眼球・瞳孔の描画（白目を抑え、小さな瞳孔でこちらを射抜く不気味な視線） */}
            {appearance.eyeStyle === 'NORMAL' && (
              <g>
                {/* 落ち着いたくすんだ強膜（白目） */}
                <path
                  d="M 114 79 Q 123 74 132 79 Q 123 84 114 79 Z"
                  fill={isKeyWoman ? '#e7e5e4' : '#cbd5e1'}
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                <path
                  d="M 148 79 Q 157 74 166 79 Q 157 84 148 79 Z"
                  fill={isKeyWoman ? '#d6d3d1' : '#94a3b8'}
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                {/* 焦点の合った小さな暗い虹彩とピンホール瞳孔 */}
                <circle cx="123" cy="79" r={isKeyWoman ? 3.2 : 2.5} fill="#09090b" />
                <circle cx="157" cy="79" r={isKeyWoman ? 3.2 : 2.5} fill="#09090b" />
                {/* 微小なキャッチライト（2Fの彼女は切迫した潤み、一般人は冷たい1点光） */}
                <circle cx="122" cy="78" r={isKeyWoman ? 1.1 : 0.8} fill="#f8fafc" />
                <circle cx="156" cy="78" r={isKeyWoman ? 1.1 : 0.8} fill="#f8fafc" />
                {/* 下まぶたのクマ線 */}
                <path d="M 115 84 Q 123 87 131 84" fill="none" stroke={skinDeep} strokeWidth="1.1" />
                <path d="M 149 84 Q 157 87 165 84" fill="none" stroke={skinDeep} strokeWidth="1.1" />
              </g>
            )}

            {appearance.eyeStyle === 'DEAD_DARK' && (
              <g>
                <path
                  d="M 113 79 Q 123 73 133 79 Q 123 85 113 79 Z"
                  fill="#9ca3af"
                  stroke="#09090b"
                  strokeWidth="1.4"
                />
                <circle cx="123" cy="79" r="1.3" fill="#000000" />
                <path
                  d="M 147 79 Q 157 73 167 79 Q 157 85 147 79 Z"
                  fill="#9ca3af"
                  stroke="#09090b"
                  strokeWidth="1.4"
                />
                <circle cx="157" cy="79" r="1.3" fill="#000000" />
              </g>
            )}

            {appearance.eyeStyle === 'HOLLOW' && (
              <g>
                {/* 漆黒に陥没した眼窩と、奥底で白く光る極小のピンホール瞳孔 */}
                <path
                  d="M 111 76 C 114 69, 131 70, 134 77 C 134 86, 128 91, 122 91 C 114 90, 110 84, 111 76 Z"
                  fill="#000000"
                />
                <path
                  d="M 146 77 C 149 70, 166 69, 169 76 C 170 84, 166 90, 158 91 C 152 91, 146 86, 146 77 Z"
                  fill="#000000"
                />
                {!appearance.isShadowedFace && (
                  <>
                    <circle cx="123" cy="80" r="1.3" fill="#e7e5e4" />
                    <circle cx="157" cy="80" r="1.3" fill="#e7e5e4" />
                  </>
                )}
                {appearance.hasBloodStains && (
                  <>
                    <path d="M 122 90 L 120 112 L 124 108 Z" fill="#991b1b" />
                    <path d="M 158 90 L 156 114 L 160 109 Z" fill="#991b1b" />
                  </>
                )}
              </g>
            )}

            {appearance.eyeStyle === 'GLOWING_RED' && (
              <g>
                {/* 漆黒の眼窩の中で燃える真紅の眼光と白い核 */}
                <path
                  d="M 111 76 C 115 70, 131 71, 134 78 C 133 85, 128 89, 122 89 C 114 89, 110 83, 111 76 Z"
                  fill="#050505"
                />
                <path
                  d="M 146 78 C 149 71, 165 70, 169 76 C 170 83, 166 89, 158 89 C 152 89, 147 85, 146 78 Z"
                  fill="#050505"
                />
                <ellipse cx="123" cy="79" rx="6" ry="3.2" fill="#dc2626" />
                <circle cx="123" cy="79" r="1.6" fill="#fef2f2" />
                <ellipse cx="157" cy="79" rx="6" ry="3.2" fill="#dc2626" />
                <circle cx="157" cy="79" r="1.6" fill="#fef2f2" />
              </g>
            )}

            {appearance.eyeStyle === 'MULTIPLE' && (
              <g>
                <circle cx="122" cy="76" r="4.5" fill="#050505" />
                <circle cx="122" cy="76" r="2" fill="#ef4444" />
                <circle cx="158" cy="76" r="4.5" fill="#050505" />
                <circle cx="158" cy="76" r="2" fill="#ef4444" />
                <circle cx="140" cy="64" r="5" fill="#050505" />
                <circle cx="140" cy="64" r="2.2" fill="#ef4444" />
                <circle cx="116" cy="87" r="3.5" fill="#050505" />
                <circle cx="116" cy="87" r="1.5" fill="#f87171" />
                <circle cx="164" cy="87" r="3.5" fill="#050505" />
                <circle cx="164" cy="87" r="1.5" fill="#f87171" />
              </g>
            )}

            {/* 4-G. 口元・唇・ほうれい線・顎先の彫刻的陰影 */}
            <g>
              {/* ほうれい線（鼻翼から口角へ落ちる鋭い影線） */}
              <path
                d="M 131 94 Q 125 101 123 109 M 149 94 Q 155 101 157 109"
                fill="none"
                stroke={skinDeep}
                strokeWidth="1.3"
                opacity="0.75"
              />

              {appearance.mouthStyle === 'NEUTRAL' && (
                <g>
                  {/* 上唇の暗いM字影と一文字に結んだ口元 */}
                  <path
                    d="M 128 107 Q 135 104 140 106 Q 145 104 152 107 Q 140 109 128 107 Z"
                    fill={skinDeep}
                  />
                  {/* 下唇の下のくぼみ影 */}
                  <path
                    d="M 133 111 Q 140 115 147 111"
                    fill="none"
                    stroke={skinDeep}
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {appearance.mouthStyle === 'SMILE' && (
                <g>
                  <path
                    d="M 126 105 Q 140 114 154 105 Q 140 110 126 105 Z"
                    fill={skinDeep}
                  />
                  <path
                    d="M 132 112 Q 140 116 148 112"
                    fill="none"
                    stroke={skinDeep}
                    strokeWidth="1.3"
                  />
                </g>
              )}

              {appearance.mouthStyle === 'SMIRK' && (
                <g>
                  {/* 片側の口角だけが不自然に吊り上がった歪な笑み */}
                  <path
                    d="M 127 108 Q 141 110 155 101 Q 142 107 127 108 Z"
                    fill={skinDeep}
                  />
                  <line x1="155" y1="101" x2="157" y2="98" stroke={skinDeep} strokeWidth="1.5" />
                </g>
              )}

              {appearance.mouthStyle === 'JAGGED_GRIN' && (
                <g>
                  {/* 耳元まで裂けた怪異の口と不揃いな白い歯列 */}
                  <path
                    d="M 116 101 Q 140 126 164 101 Q 140 111 116 101 Z"
                    fill="#050507"
                    stroke="#7f1d1d"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 122 104 L 125 112 L 129 105 L 133 114 L 137 106 L 140 115 L 143 106 L 147 114 L 151 105 L 155 112 L 158 104"
                    fill="none"
                    stroke="#d6d3d1"
                    strokeWidth="1.4"
                  />
                </g>
              )}

              {appearance.mouthStyle === 'OPEN_VOID' && (
                <g>
                  {/* 顎が外れて縦に大きく開いた漆黒の虚無の口 */}
                  <path
                    d="M 127 100 C 132 95, 148 95, 153 100 C 156 112, 151 126, 140 127 C 129 126, 124 112, 127 100 Z"
                    fill="#000000"
                    stroke="#450a0a"
                    strokeWidth="1.5"
                  />
                  <path d="M 132 100 L 135 105 L 140 100 L 145 105 L 148 100" fill="#a8a29e" />
                </g>
              )}
            </g>

            {/* 4-H. 前髪・頭髪のシルエット＆額に落ちる前髪の濃い影（ツルツル頭部の完全廃止） */}
            {!appearance.hasCap && (
              <g>
                {hairType === 'KEY_WOMAN_LONG' && (
                  <g>
                    {/* 額に落ちる前髪の濃いキアロスクーロ影 */}
                    <path
                      d="M 103 68 C 112 52, 126 62, 136 50 C 146 62, 162 54, 177 68 C 166 44, 154 34, 140 34 C 126 34, 114 44, 103 68 Z"
                      fill="#09090b"
                    />
                    {/* 頭頂部から顔の輪郭両脇へ垂れ下がる長い黒髪の束 */}
                    <path
                      d="M 140 26 C 108 26, 94 48, 95 82 C 96 114, 92 146, 86 178 L 102 166 C 104 134, 105 98, 108 72 C 115 62, 123 56, 134 48 C 138 58, 144 64, 150 54 C 159 60, 166 66, 172 74 C 175 98, 176 134, 178 166 L 194 178 C 188 146, 184 114, 185 82 C 186 48, 172 26, 140 26 Z"
                      fill="#09090b"
                      stroke="#27272a"
                      strokeWidth="1"
                    />
                    {/* 顔にかかる繊細なほつれ毛と天使の輪ハイライト */}
                    <path
                      d="M 114 42 C 124 34, 152 34, 164 42"
                      fill="none"
                      stroke="#52525b"
                      strokeWidth="1.6"
                      opacity="0.7"
                    />
                    <path
                      d="M 118 52 C 114 68, 112 82, 115 96 M 164 52 C 168 68, 169 82, 165 96"
                      fill="none"
                      stroke="#09090b"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {hairType === 'ANOMALY_WET_LONG' && (
                  <g>
                    {/* 顔面に張り付く濡れた黒髪の不気味な束 */}
                    <path
                      d="M 140 25 C 106 25, 94 48, 96 86 L 104 148 L 111 92 L 118 76 L 125 98 L 131 62 L 140 84 L 148 58 L 156 96 L 162 72 L 169 94 L 176 148 L 184 86 C 186 48, 174 25, 140 25 Z"
                      fill="#050507"
                    />
                  </g>
                )}

                {hairType === 'FEMALE_COAT_BOB' && (
                  <g>
                    {/* 額に落ちる斜め前髪の影 */}
                    <path
                      d="M 103 68 C 118 56, 146 58, 177 72 L 176 52 L 104 52 Z"
                      fill="#09090b"
                    />
                    {/* エレガントかつ不気味なボブヘアの外枠 */}
                    <path
                      d="M 140 26 C 108 26, 95 48, 96 82 C 97 108, 102 128, 112 138 L 110 114 C 106 94, 106 74, 112 62 C 128 54, 152 56, 168 66 C 174 78, 174 96, 170 114 L 168 138 C 178 128, 183 108, 184 82 C 185 48, 172 26, 140 26 Z"
                      fill="#141210"
                      stroke="#292524"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 112 40 Q 140 31 168 42"
                      fill="none"
                      stroke="#57534e"
                      strokeWidth="1.6"
                      opacity="0.65"
                    />
                  </g>
                )}

                {hairType === 'PARTED_NEAT' && (
                  <g>
                    {/* 額に落ちる七三分け前髪のシャープな影 */}
                    <path
                      d="M 103 68 C 116 54, 128 52, 134 62 C 148 52, 164 56, 177 68 L 175 48 L 105 48 Z"
                      fill="#09090b"
                    />
                    {/* 七三分け・スーツ男性の端正な黒髪シルエット */}
                    <path
                      d="M 124 30 C 106 34, 96 50, 99 76 L 105 78 L 107 58 C 116 48, 126 48, 132 56 C 144 46, 162 48, 173 60 L 175 78 L 181 76 C 184 50, 174 32, 152 28 C 142 26, 132 27, 124 30 Z"
                      fill="#141417"
                      stroke="#27272a"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 126 36 C 142 32, 160 35, 170 46"
                      fill="none"
                      stroke="#52525b"
                      strokeWidth="1.4"
                      opacity="0.6"
                    />
                  </g>
                )}

                {(hairType === 'MESSY_SHORT' || hairType === 'HOODED_HUNCH') && (
                  <g>
                    {/* 額に垂れる無造作な前髪の濃い影 */}
                    <path
                      d="M 102 70 L 114 58 L 122 68 L 134 56 L 144 68 L 156 56 L 166 68 L 178 64 L 174 46 L 106 46 Z"
                      fill="#09090b"
                    />
                    {/* ボサボサの短髪外枠シルエット */}
                    <path
                      d="M 140 24 L 126 28 L 112 26 L 104 38 L 96 48 L 99 78 L 105 76 L 107 58 L 116 64 L 124 52 L 135 64 L 144 52 L 154 64 L 164 54 L 173 62 L 175 76 L 181 78 L 184 48 L 176 36 L 164 27 L 150 28 Z"
                      fill="#18181b"
                      stroke="#27272a"
                      strokeWidth="1.1"
                    />
                  </g>
                )}
              </g>
            )}

            {/* 4-I. 帽子・制帽・作業帽（通達④「青服＋制帽」、通達⑤「赤いコート＋帽子」の重要識別パーツ） */}
            {appearance.hasCap && (
              <g>
                {/* 帽子のツバが額〜目元上部に落とす漆黒のバイザーシャドウ */}
                <path
                  d="M 100 56 Q 140 72 180 56 L 178 74 Q 140 66 102 74 Z"
                  fill="#050507"
                  opacity="0.92"
                />
                {/* こめかみから覗くサイドの短髪 */}
                <path
                  d="M 99 56 L 98 76 L 105 74 L 105 56 Z M 181 56 L 182 76 L 175 74 L 175 56 Z"
                  fill="#141417"
                />

                {isRedCoat ? (
                  /* ★ 赤いコートの偽物（通達⑤）：シルエットが一目で分かるつば広フェドラハット（中折れ帽） */
                  <g>
                    {/* クラウン（中折れ帽の山） */}
                    <path
                      d="M 98 52 L 106 20 C 118 14, 132 22, 140 22 C 148 22, 162 14, 174 20 L 182 52 Z"
                      fill="#291212"
                      stroke="#09090b"
                      strokeWidth="1.8"
                    />
                    {/* クラウンの明部 */}
                    <path
                      d="M 100 50 L 107 22 C 118 17, 130 23, 138 23 L 136 50 Z"
                      fill="#4c1d1d"
                    />
                    {/* 赤いリボン帯 */}
                    <path
                      d="M 98 44 Q 140 50 182 44 L 183 51 Q 140 57 97 51 Z"
                      fill="#991b1b"
                      stroke="#09090b"
                      strokeWidth="1"
                    />
                    {/* 左右へ大きく張り出したつば広ブリム（隙間からでも確実に視認可能） */}
                    <path
                      d="M 74 52 Q 140 42 206 52 Q 140 64 74 52 Z"
                      fill="#171414"
                      stroke="#a8a29e"
                      strokeWidth="1.4"
                    />
                  </g>
                ) : isBlueGuardOrCoat ? (
                  /* ★ 夜間警備員の八角制帽（通達④：青いクラウン＋金色の帽章エンブレム＋黒エナメルバイザー） */
                  <g>
                    {/* 八角制帽の張ったクラウン上部 */}
                    <polygon
                      points="88,32 110,16 170,16 192,32 182,52 98,52"
                      fill={palette.mid}
                      stroke="#09090b"
                      strokeWidth="1.8"
                    />
                    {/* クラウン左側のハイライト面 */}
                    <polygon
                      points="90,32 110,17 140,17 140,50 99,50"
                      fill={palette.light}
                    />
                    {/* 制帽の黒い鉢巻バンドと金色の顎紐 */}
                    <rect
                      x="97"
                      y="43"
                      width="86"
                      height="9"
                      fill="#09090b"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    <line x1="98" y1="49" x2="182" y2="49" stroke="#fbbf24" strokeWidth="1.8" />
                    {/* 黒く光るエナメルバイザー（つば） */}
                    <path
                      d="M 92 50 Q 140 64 188 50 L 182 59 Q 140 72 98 59 Z"
                      fill="#09090b"
                      stroke="#94a3b8"
                      strokeWidth="1.3"
                    />
                    {/* 金色の警備帽章（エンブレム） */}
                    <polygon
                      points="140,24 148,31 145,41 135,41 132,31"
                      fill="#fbbf24"
                      stroke="#78350f"
                      strokeWidth="1"
                    />
                    <circle cx="140" cy="33" r="2.5" fill="#fef08a" />
                  </g>
                ) : (
                  /* ★ 配達員のワークキャップ（通達③） */
                  <g>
                    <path
                      d="M 96 52 C 96 24, 114 16, 140 16 C 166 16, 184 24, 184 52 Z"
                      fill={palette.mid}
                      stroke="#09090b"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M 98 50 C 98 26, 114 18, 138 18 L 138 50 Z"
                      fill={palette.light}
                    />
                    {/* ワークキャップのカーブした硬いつば */}
                    <path
                      d="M 90 49 Q 140 61 190 49 L 184 58 Q 140 69 96 58 Z"
                      fill="#141413"
                      stroke="#78716c"
                      strokeWidth="1.2"
                    />
                    {/* 帽子正面の配送業者ワッペン */}
                    <rect
                      x="128"
                      y="29"
                      width="24"
                      height="11"
                      rx="2"
                      fill="#1c1917"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                    />
                    <line x1="132" y1="34.5" x2="148" y2="34.5" stroke="#fbbf24" strokeWidth="2" />
                  </g>
                )}
              </g>
            )}
          </g>
        </g>
      </svg>
    );
  }
);

export const VisitorView: React.FC<VisitorViewProps> = React.memo(({
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

  const effectiveAppearance = useMemo(() => {
    if (!visitor) return undefined;
    if (isTransformed && visitor.peekTransformation) {
      return { ...visitor.appearance, ...visitor.peekTransformation.revealedAppearance };
    }
    return visitor.appearance;
  }, [visitor, isTransformed]);

  // 扉を初期隙間（12%）から広げて「覗き込んでいる」度合い (0.0 〜 1.0)
  const peekRatio = Math.max(0, Math.min(1, (doorOpenPercent - 12) / 60));

  // こじ開け怪異が扉を開くにつれてじわじわ近づいてくる比率 (0.0 〜 1.0)
  const isPryingVisitor = Boolean(visitor && visitor.requiredCloseClicks > 1);
  const pryApproachRatio = Math.max(0, Math.min(1, (doorOpenPercent - 12) / 88));

  const visitorScale =
    visitor && gameState === 'EVENT_RESULT' && visitor.isThreat && doorOpenPercent >= 90
      ? 1.36
      : isPryingVisitor
      ? 1.0 + pryApproachRatio * 0.22
      : 1.0 + peekRatio * 0.05;
  const visitorTranslateY = isPryingVisitor
    ? 8 * pryApproachRatio
    : isHoldingOpen
    ? -3 * peekRatio
    : 0;

  const isNameTagVisible = doorOpenPercent > 18;

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
      {isNormalEndingView ? (
        <NormalEndingBackdrop />
      ) : isTrueEndingView ? (
        /* ★ 最終フロア演出②：B1F トゥルーエンディング */
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#090d16]">
          <TrueEndingStaticScene />
          {/* 扉が開くにつれて強まる朝の光ブルーム */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150 will-change-[opacity]"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.85) 0%, rgba(254,249,195,0.45) 42%, rgba(56,189,248,0.15) 80%, transparent 100%)',
              opacity: Math.max(0.15, (doorOpenPercent / 100) * 0.85),
            }}
          />
        </div>
      ) : (
        <CorridorBackdrop floor={floor} />
      )}

      {/* 2. 訪問者シルエット＆パーツ描画（GPU transformのみで拡縮・移動、SVG本体はメモ化） */}
      {!isNormalEndingView && !isTrueEndingView && showVisitor && visitor && effectiveAppearance && (
        <div
          key={`${visitor.id}-${floor}`}
          style={{
            transform: `translate3d(0, ${visitorTranslateY}px, 0) scale(${visitorScale})`,
            willChange: 'transform',
            transition: isPryingVisitor ? 'transform 65ms linear' : 'transform 160ms ease-out',
          }}
          className={`relative z-10 flex flex-col items-center justify-end h-[90%] w-80 pointer-events-none ${glitchClass}`}
        >
          {/* 静かな呼吸の揺れ */}
          <motion.div
            style={{ willChange: 'transform' }}
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full h-full flex items-end justify-center"
          >
            <VisitorIllustrationSvg
              visitorId={visitor.id}
              appearance={effectiveAppearance}
              isKeyWoman={Boolean(visitor.isKeyWoman)}
              isNameTagVisible={isNameTagVisible}
            />
          </motion.div>
        </div>
      )}

      {/* 3. 隙間覗き込みの周辺減光（ビネット） */}
      <div
        className="absolute inset-0 z-15 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, transparent 35%, rgba(0, 0, 0, 0.72) 92%)',
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
});

