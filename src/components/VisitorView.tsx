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

function resolveClothingPalette(color: string, isKeyWoman: boolean): ColorPalette {
  const c = color.toLowerCase();
  if (isKeyWoman || c === '#d6d3d1') {
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
  if (c === '#44403c' || c === '#78716c' || c === '#57534e') {
    return {
      base: '#36312c',
      mid: '#4a433c',
      light: '#6b6156',
      rim: '#96897a',
      shadow: '#1a1715',
      deep: '#0b0a09',
      collar: '#595047',
      tie: '#3b1313',
    };
  }
  return {
    base: '#2e3036',
    mid: '#3f424a',
    light: '#5c606b',
    rim: '#858a99',
    shadow: '#15161a',
    deep: '#09090b',
    collar: '#4c5059',
    tie: '#1e1b4b',
  };
}

type HairArchetype =
  | 'KEY_WOMAN_LONG'
  | 'ANOMALY_WET_LONG'
  | 'FEMALE_COAT_BOB'
  | 'SHOULDER_LONG'
  | 'PARTED_NEAT'
  | 'SLICKED_BACK'
  | 'HEAVY_BANGS'
  | 'MESSY_SHORT'
  | 'HOODED_HUNCH';

function resolveHairArchetype(
  visitorId: string,
  appearance: VisitorAppearance,
  isKeyWoman: boolean
): HairArchetype {
  if (isKeyWoman || visitorId === 'v-ch3-key-woman') return 'KEY_WOMAN_LONG';
  if (visitorId === 'v-any-neck-anomaly') return 'ANOMALY_WET_LONG';
  if (appearance.silhouetteType === 'HUNCHED' && appearance.isShadowedFace) {
    return 'HOODED_HUNCH';
  }
  if (visitorId === 'v-ch1-peek-trap-woman' || visitorId === 'v-ch2-sick-fan-resident') {
    return 'SHOULDER_LONG';
  }
  if (visitorId.includes('red-coat')) {
    return 'FEMALE_COAT_BOB';
  }
  if (visitorId === 'v-ch2-peek-trap-gentleman') {
    return 'SLICKED_BACK';
  }
  if (
    visitorId === 'v-ch1-blue-coat-intruder' ||
    visitorId === 'v-ch1-sleeper-resident' ||
    visitorId === 'v-ch1-floor12-phantom' ||
    visitorId === 'v-ch3-room-number-ghost'
  ) {
    return 'HEAVY_BANGS';
  }
  if (appearance.silhouetteType === 'SUIT') return 'PARTED_NEAT';
  return 'MESSY_SHORT';
}

type GarmentArchetype =
  | 'KEY_WOMAN_DRESS'
  | 'TAILORED_SUIT'
  | 'SECURITY_UNIFORM'
  | 'RED_TRENCH_COAT'
  | 'OVERCOAT_CARDIGAN'
  | 'DELIVERY_JACKET'
  | 'LOUNGE_HOODIE';

function resolveGarmentArchetype(
  visitorId: string,
  appearance: VisitorAppearance,
  isKeyWoman: boolean
): GarmentArchetype {
  if (isKeyWoman || visitorId === 'v-ch3-key-woman') return 'KEY_WOMAN_DRESS';
  const c = appearance.clothingColor.toLowerCase();
  if (c === '#991b1b') return 'RED_TRENCH_COAT';
  if (c === '#1e40af' || c === '#1e3a8a' || visitorId === 'v-ch2-blue-no-cap-imposter') {
    return 'SECURITY_UNIFORM';
  }
  if (appearance.silhouetteType === 'SUIT') return 'TAILORED_SUIT';
  if (visitorId.includes('delivery')) return 'DELIVERY_JACKET';
  if (
    visitorId === 'v-ch1-floor12-phantom' ||
    visitorId === 'v-ch1-peek-innocent-shadow'
  ) {
    return 'LOUNGE_HOODIE';
  }
  return 'OVERCOAT_CARDIGAN';
}

function resolveHasGlasses(visitorId: string, appearance: VisitorAppearance): boolean {
  if (appearance.isShadowedFace) return false;
  return (
    visitorId === 'v-ch2-polite-resident' ||
    visitorId === 'v-ch2-peek-trap-gentleman' ||
    visitorId === 'v-ch1-sleeper-resident' ||
    visitorId === 'v-ch2-sick-fan-resident'
  );
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
 * ハイコントラスト・キアロスクーロ（版画・逆光シルエット調）訪問者ベクターイラスト
 * - 重いSVG filter（feGaussianBlur等）やCSS drop-shadowを一切排除
 * - 顔内部の鼻筋・頬骨・シワ・厚い唇を廃止し、廊下の天井灯による逆光シルエット（#0c0c0e〜#141418）＋暗がりから覗く目元のみで表現
 * - 訪問者ごとに異なる髪型・眼鏡・服装の徹底描き込みと、胸ポケット付近に安全ピンで直接留めた名札
 */
const VisitorIllustrationSvg = React.memo<VisitorIllustrationProps>(
  ({ visitorId, appearance, isKeyWoman }) => {
    const palette = useMemo(
      () => resolveClothingPalette(appearance.clothingColor, isKeyWoman),
      [appearance.clothingColor, isKeyWoman]
    );

    const hairType = useMemo(
      () => resolveHairArchetype(visitorId, appearance, isKeyWoman),
      [visitorId, appearance, isKeyWoman]
    );

    const garmentType = useMemo(
      () => resolveGarmentArchetype(visitorId, appearance, isKeyWoman),
      [visitorId, appearance, isKeyWoman]
    );

    const hasGlasses = useMemo(
      () => resolveHasGlasses(visitorId, appearance),
      [visitorId, appearance]
    );

    const isRedCoat = garmentType === 'RED_TRENCH_COAT';
    const isBlueGuardOrCoat =
      garmentType === 'SECURITY_UNIFORM' ||
      appearance.clothingColor.toLowerCase() === '#1d4ed8';

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

    // 逆光シルエット用の顔・首トーン（顔全体が暗い影 #0c0c0e〜#141418 に沈み、輪郭縁のみ微かな逆光ハイライト）
    const faceSilhouetteBase = appearance.isShadowedFace
      ? '#09090b'
      : isKeyWoman
      ? '#131318'
      : '#101014';
    const faceSilhouetteDeep = '#09090c';
    const faceRimLight = isKeyWoman ? '#64748b' : '#3f3f46';

    return (
      <svg
        viewBox="0 0 280 390"
        className="w-full h-full overflow-visible select-none"
      >
        <defs>
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
                d="M 96 68 C 80 96, 72 152, 68 236 C 84 228, 95 202, 104 168 L 176 168 C 185 202, 196 228, 212 236 C 208 152, 200 96, 184 68 Z"
                fill="#09090b"
                stroke="#27272a"
                strokeWidth="1"
              />
              {/* 髪の立体ハイライト束 */}
              <path
                d="M 92 84 C 82 122, 78 168, 74 218 C 81 190, 88 148, 96 112 Z"
                fill="#27272a"
              />
              <path
                d="M 188 84 C 196 122, 200 168, 204 216 C 195 186, 190 145, 183 112 Z"
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

          {hairType === 'SHOULDER_LONG' && (
            <path
              d="M 96 68 C 86 98, 82 138, 80 176 L 98 168 L 106 146 L 174 146 L 182 168 L 200 176 C 198 138, 194 98, 184 68 Z"
              fill="#0c0c0f"
              stroke="#27272a"
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
              2. 首・鎖骨の逆光シルエット接続レイヤー（頭部の浮きを完全解消）
              ============================================================ */}
          <g>
            {/* 襟元の奥の深い闇 */}
            <path
              d="M 102 142 L 178 142 L 172 218 L 108 218 Z"
              fill="#050507"
            />

            {/* 首柱ベース（逆光の暗い影に沈んだ自然な太さの首） */}
            <path
              d={
                appearance.silhouetteType === 'TALL_DISTORTED'
                  ? 'M 118 98 C 120 118, 114 138, 102 156 L 178 156 C 166 138, 160 118, 162 98 Z'
                  : 'M 116 106 C 117 124, 111 138, 98 152 L 182 152 C 169 138, 163 124, 164 106 Z'
              }
              fill={faceSilhouetteBase}
              stroke="#050507"
              strokeWidth="1.5"
            />

            {/* 顎下〜首右半分のさらに深い落ち影 */}
            <path
              d="M 120 108 C 132 122, 148 124, 163 108 C 164 125, 170 139, 180 151 L 136 158 C 136 136, 130 122, 120 108 Z"
              fill={faceSilhouetteDeep}
            />

            {/* 首左縁にだけ走る微かな逆光リムハイライトと胸鎖乳突筋のわずかな陰影 */}
            <path
              d="M 117 110 C 118 125, 113 138, 103 149"
              fill="none"
              stroke={faceRimLight}
              strokeWidth="1.3"
              opacity="0.65"
            />
            <path
              d="M 124 118 L 136 152 M 156 118 L 144 152"
              stroke="#050507"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* 鎖骨のほのかなリムライト（特に2Fの彼女や開襟時） */}
            <path
              d="M 110 148 Q 126 153 137 156 M 170 148 Q 154 153 143 156"
              fill="none"
              stroke={faceRimLight}
              strokeWidth="1.1"
              opacity={isKeyWoman ? 0.65 : 0.35}
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
            {/* 3-A. 外套・スーツ・衣服のメインシルエット（肩の丸みから上腕・袖口へ自然に連なる骨格ライン） */}
            <path
              d="M 102 144 C 84 148, 69 151, 56 156 C 42 162, 35 176, 33 196 C 31 224, 30 264, 31 315 C 32 348, 33 372, 34 390 L 246 390 C 247 372, 248 348, 249 315 C 250 264, 249 224, 247 196 C 245 176, 238 162, 224 156 C 211 151, 196 148, 178 144 L 166 154 C 154 166, 126 166, 114 154 Z"
              fill={palette.base}
              stroke={palette.deep}
              strokeWidth="2.2"
            />

            {/* 3-B. 左肩〜上腕・左胸の明部（廊下上方の照明を受けるハイライト面） */}
            <path
              d="M 102 144 C 84 148, 69 151, 56 156 C 42 162, 35 176, 33 196 C 31 224, 30 264, 31 315 C 32 348, 33 372, 34 390 L 136 390 L 138 164 L 114 152 Z"
              fill={palette.mid}
            />
            {/* 左袖外側の円筒ハイライト（肩縫い目ラインに沿って自然に落ちる立体光） */}
            <path
              d="M 62 157 C 46 162, 38 175, 36 196 C 34 224, 33 264, 34 316 C 34 338, 35 356, 36 372 L 48 372 C 47 322, 47 266, 49 222 C 50 198, 54 176, 63 163 Z"
              fill={palette.light}
              opacity="0.82"
            />
            {/* 左僧帽筋（襟元〜肩先）へのなだらかな上面光 */}
            <path
              d="M 102 145 C 86 149, 71 152, 60 156 L 63 163 C 75 158, 90 154, 108 150 Z"
              fill={palette.light}
              opacity="0.72"
            />
            <path
              d="M 100 145 C 83 149, 69 152, 57 157 C 43 163, 37 176, 35 196 C 33 222, 32 262, 33 312"
              fill="none"
              stroke={palette.rim}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.78"
            />

            {/* 3-C. 右胸〜右肩・右袖の深い漆黒の落ち影（身頃を分断しない自然な明暗境界） */}
            <path
              d="M 142 162 L 166 154 L 178 144 C 196 148, 211 151, 224 156 C 238 162, 245 176, 247 196 C 249 224, 250 264, 249 315 C 248 348, 247 372, 246 390 L 140 390 Z"
              fill={palette.shadow}
            />
            {/* 右肩口（アームホール）から外腕側へ自然に落ちる濃陰 */}
            <path
              d="M 218 157 L 224 156 C 238 162, 245 176, 247 196 C 249 224, 250 264, 249 315 C 248 348, 247 372, 246 390 L 212 390 C 213 330, 215 270, 214 218 C 212 198, 214 176, 218 157 Z"
              fill={palette.deep}
              opacity="0.74"
            />
            <path
              d="M 224 157 C 237 163, 243 177, 245 196 C 247 220, 248 252, 248 292"
              fill="none"
              stroke={palette.mid}
              strokeWidth="1.1"
              strokeLinecap="round"
              opacity="0.38"
            />

            {/* 3-D. 服装タイプ別の高密度仕立て・ラペル・ポケット・ドレープ描き込み（情報量2倍強化） */}
            {garmentType === 'KEY_WOMAN_DRESS' ? (
              /* ★ 2F「鍵となる彼女」専用：薄汚れた白い服の幾重もの繊細なドレープ影と鎖骨が開いた襟元 */
              <g>
                {/* 鎖骨が見える広く緩いネックラインと二重の布縁 */}
                <path
                  d="M 102 144 C 115 174, 165 174, 178 144 C 170 184, 110 184, 102 144 Z"
                  fill="#0b0a09"
                  stroke={palette.light}
                  strokeWidth="1.5"
                />
                <path
                  d="M 100 148 C 114 180, 166 180, 180 148"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="1.1"
                  opacity="0.7"
                />
                {/* 左肩〜胸元〜裾へ流れる白い布のハイライト・ドレープ群 */}
                <path
                  d="M 88 152 C 102 194, 110 265, 102 388 L 126 388 C 128 268, 122 200, 110 162 Z"
                  fill={palette.light}
                  opacity="0.78"
                />
                <path
                  d="M 66 164 C 72 222, 74 295, 70 388 L 88 388 C 92 298, 90 224, 80 164 Z"
                  fill={palette.rim}
                  opacity="0.52"
                />
                <path
                  d="M 46 184 C 44 236, 44 308, 44 388 L 56 388 C 56 308, 56 236, 58 182 Z"
                  fill={palette.light}
                  opacity="0.42"
                />
                {/* 鎖骨下から胸元へ集まる放射状のギャザー・カテナリー曲線シワ */}
                <path
                  d="M 106 168 Q 140 198 172 168 M 112 184 Q 140 214 168 184 M 116 204 Q 140 232 164 204"
                  fill="none"
                  stroke={palette.shadow}
                  strokeWidth="1.6"
                  opacity="0.75"
                />
                {/* 幾重にも刻まれた深い布の縦シワ・落ち影 */}
                <path
                  d="M 96 172 C 102 228, 100 302, 94 388 L 101 388 C 107 302, 108 228, 101 172 Z"
                  fill={palette.shadow}
                  opacity="0.85"
                />
                <path
                  d="M 114 170 C 120 228, 118 302, 112 388 L 121 388 C 127 302, 127 228, 120 170 Z"
                  fill={palette.shadow}
                />
                <path
                  d="M 136 174 C 138 235, 134 310, 130 388 L 146 388 C 148 308, 148 232, 142 174 Z"
                  fill={palette.deep}
                  opacity="0.9"
                />
                <path
                  d="M 160 166 C 168 228, 174 302, 180 388 L 194 388 C 186 298, 180 224, 170 162 Z"
                  fill={palette.deep}
                />
                <path
                  d="M 184 172 C 194 234, 198 308, 200 388 L 210 388 C 208 304, 204 232, 192 168 Z"
                  fill="#09090b"
                  opacity="0.78"
                />
                {/* 袖ぐり・肘周辺の柔らかな生地のたわみシワ */}
                <path
                  d="M 68 214 Q 82 226 92 234 M 69 240 Q 82 250 92 256 M 212 214 Q 198 226 188 234 M 211 240 Q 198 250 188 256"
                  fill="none"
                  stroke={palette.shadow}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.68"
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
            ) : garmentType === 'SECURITY_UNIFORM' ? (
              /* ★ 警備制服（通達④対象）：エポーレット（肩章）・金ボタン・両胸フラップポケット・ネクタイピン・制服用切替線 */
              <g>
                {/* Vゾーン内の制服用ブルーグレーシャツと影 */}
                <polygon
                  points="114,148 166,148 140,236"
                  fill="#cbd5e1"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
                <polygon points="140,148 166,148 140,236" fill="#64748b" />
                {/* シャツの襟 */}
                <polygon
                  points="113,144 138,166 124,180 108,154"
                  fill="#e2e8f0"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                />
                <polygon
                  points="167,144 142,166 156,180 172,154"
                  fill="#94a3b8"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
                {/* 濃紺ネクタイ（結び目・ディンプル影・剣先・金属タイピン） */}
                <polygon
                  points="134,164 146,164 143,177 137,177"
                  fill={palette.tie ?? '#0f172a'}
                  stroke="#09090b"
                  strokeWidth="1"
                />
                <polygon
                  points="137,177 143,177 147,232 140,244 133,232"
                  fill={palette.tie ?? '#0f172a'}
                  stroke="#09090b"
                  strokeWidth="1"
                />
                <line x1="140" y1="177" x2="140" y2="205" stroke="#020617" strokeWidth="1.2" />
                {/* 銀色のネクタイピン */}
                <rect x="134" y="198" width="13" height="2.8" fill="#e2e8f0" stroke="#09090b" strokeWidth="0.7" />
                {/* 制服用ノッチドラペル（左：明部＋ステッチ、右：暗部＋ロール影） */}
                <path
                  d="M 102 144 L 116 148 L 140 242 L 112 238 L 93 184 L 103 174 L 96 160 Z"
                  fill="#040508"
                  opacity="0.55"
                />
                <path
                  d="M 102 144 L 116 148 L 140 242 L 110 228 L 95 184 L 105 174 L 98 160 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 104 148 L 114 151 L 136 234 L 112 223 L 99 184 L 108 174 L 101 160"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="0.9"
                  opacity="0.75"
                />
                <path
                  d="M 178 144 L 164 148 L 140 242 L 170 228 L 185 184 L 175 174 L 182 160 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                {/* 両肩のエポーレット（肩章）＋金ボタン（新しいなだらかな肩線に沿う位置） */}
                <polygon
                  points="60,157 98,145 103,153 64,165"
                  fill={palette.rim}
                  stroke="#09090b"
                  strokeWidth="1.4"
                />
                <circle cx="95" cy="150" r="2.7" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
                <polygon
                  points="220,157 182,145 177,153 216,165"
                  fill={palette.light}
                  stroke="#09090b"
                  strokeWidth="1.4"
                />
                <circle cx="185" cy="150" r="2.7" fill="#d97706" stroke="#09090b" strokeWidth="0.8" />
                {/* 右胸（向かって左）のプリーツ付きフラップポケット＆金ボタン・警備徽章 */}
                <rect
                  x="78"
                  y="214"
                  width="34"
                  height="34"
                  rx="1.5"
                  fill={palette.mid}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <line x1="95" y1="224" x2="95" y2="248" stroke={palette.deep} strokeWidth="1.4" />
                <polygon
                  points="77,212 113,212 111,225 95,230 79,225"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <circle cx="95" cy="224" r="2.4" fill="#fbbf24" stroke="#09090b" strokeWidth="0.7" />
                {/* 左胸（向かって右外側）のフラップポケット（名札の下地にもなる） */}
                <rect
                  x="174"
                  y="214"
                  width="34"
                  height="34"
                  rx="1.5"
                  fill={palette.shadow}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <polygon
                  points="173,212 209,212 207,225 191,230 175,225"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                {/* フロント合わせ目・金ボタン列・脇ダーツ */}
                <line x1="140" y1="242" x2="140" y2="390" stroke="#09090b" strokeWidth="2.6" />
                <circle cx="133" cy="260" r="3.4" fill="#fbbf24" stroke="#451a03" strokeWidth="1" />
                <circle cx="133" cy="292" r="3.4" fill="#fbbf24" stroke="#451a03" strokeWidth="1" />
                <circle cx="133" cy="324" r="3.4" fill="#d97706" stroke="#451a03" strokeWidth="1" />
                <path
                  d="M 94 252 L 100 388 M 186 252 L 180 388"
                  stroke={palette.deep}
                  strokeWidth="1.5"
                  opacity="0.75"
                />
              </g>
            ) : garmentType === 'TAILORED_SUIT' ? (
              /* ★ テーラードスーツ：多層ノッチドラペル・フラワーホール・ネクタイのディンプル・バルカ胸ポケット・ダーツ・袖シワ */
              <g>
                {/* Vゾーン内のドレスシャツ（明部と右半分の影面＋前立て） */}
                <polygon
                  points="114,148 166,148 140,242"
                  fill="#e7e5e4"
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
                <polygon points="140,148 166,148 140,242" fill="#78716c" />
                {/* ワイドスプレッド・シャツカラーと襟下の落ち影 */}
                <polygon points="112,148 139,170 122,186 106,158" fill="#09090b" opacity="0.55" />
                <polygon
                  points="113,144 138,166 124,180 108,154"
                  fill="#fafaf9"
                  stroke="#27272a"
                  strokeWidth="1.2"
                />
                <polygon
                  points="167,144 142,166 156,180 172,154"
                  fill="#a8a29e"
                  stroke="#18181b"
                  strokeWidth="1.2"
                />
                {/* ネクタイ（立体ノット・ディンプルのくぼみ影・剣先・斜めストライプ織柄） */}
                <polygon
                  points="133,164 147,164 144,178 136,178"
                  fill={palette.tie ?? '#312e81'}
                  stroke="#09090b"
                  strokeWidth="1.1"
                />
                <polygon
                  points="136,178 144,178 148,232 140,245 132,232"
                  fill={palette.tie ?? '#312e81'}
                  stroke="#09090b"
                  strokeWidth="1.1"
                />
                {/* ネクタイのディンプル（くぼみ影）と斜めレジメンタル織線 */}
                <path d="M 139 178 L 140 198 L 142 178 Z" fill="#09090b" opacity="0.7" />
                <line x1="135" y1="192" x2="145" y2="184" stroke="#ffffff" strokeWidth="1" opacity="0.28" />
                <line x1="134" y1="210" x2="146" y2="202" stroke="#ffffff" strokeWidth="1" opacity="0.28" />
                <line x1="133" y1="226" x2="147" y2="218" stroke="#ffffff" strokeWidth="1" opacity="0.24" />
                {/* 左ラペル下のロール落ち影（立体感を生む濃い影層） */}
                <path
                  d="M 100 146 L 140 245 L 107 235 L 91 185 L 101 174 L 94 160 Z"
                  fill="#050507"
                  opacity="0.65"
                />
                {/* 左ノッチドラペル（明部＋ゴージライン＋AMFステッチ＋フラワーホール） */}
                <path
                  d="M 102 144 L 116 148 L 140 242 L 110 228 L 95 184 L 105 174 L 98 160 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 104 148 L 114 151 L 136 234 L 112 223 L 99 184 L 108 174 L 101 160"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="0.9"
                  opacity="0.8"
                />
                {/* ゴージラインの刻みとフラワーホール（ラペル穴） */}
                <line x1="98" y1="160" x2="112" y2="165" stroke={palette.deep} strokeWidth="1.4" />
                <line x1="101" y1="184" x2="109" y2="186" stroke={palette.deep} strokeWidth="1.8" strokeLinecap="round" />
                {/* 右ノッチドラペル（暗部＋ロール落ち影） */}
                <path
                  d="M 180 146 L 140 245 L 173 235 L 189 185 L 179 174 L 186 160 Z"
                  fill="#050507"
                  opacity="0.75"
                />
                <path
                  d="M 178 144 L 164 148 L 140 242 L 170 228 L 185 184 L 175 174 L 182 160 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <line x1="182" y1="160" x2="168" y2="165" stroke={palette.deep} strokeWidth="1.4" />
                {/* 右胸の切り替えダーツ線と左胸の切り替えダーツ線 */}
                <path
                  d="M 96 236 C 102 285, 104 335, 102 388"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.4"
                  opacity="0.75"
                />
                <path
                  d="M 184 236 C 178 285, 176 335, 178 388"
                  fill="none"
                  stroke="#050507"
                  strokeWidth="1.6"
                  opacity="0.85"
                />
                {/* 左胸（向かって右外側）のバルカポケット（名札の安全ピンのすぐ上の胸ポケット） */}
                <polygon
                  points="178,195 208,192 208,197.5 178,200.5"
                  fill={palette.collar}
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                {/* フロント合わせ目・スーツボタン・ボタンホール */}
                <line x1="140" y1="242" x2="140" y2="390" stroke="#09090b" strokeWidth="2.6" />
                <line x1="138" y1="244" x2="138" y2="388" stroke={palette.rim} strokeWidth="0.8" opacity="0.45" />
                <circle cx="133" cy="262" r="3.3" fill="#09090b" stroke={palette.rim} strokeWidth="0.9" />
                <line x1="133" y1="262" x2="139" y2="262" stroke="#09090b" strokeWidth="1.2" />
                <circle cx="133" cy="298" r="3.3" fill="#09090b" stroke={palette.rim} strokeWidth="0.9" />
                <line x1="133" y1="298" x2="139" y2="298" stroke="#09090b" strokeWidth="1.2" />
                {/* ボタンへ引っ張られるX字の布テンションシワ */}
                <path
                  d="M 110 250 Q 124 260 133 262 Q 118 270 104 282"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.3"
                  opacity="0.7"
                />
              </g>
            ) : isRedCoat ? (
              /* ★ 赤いトレンチコート（通達⑤対象）：大きなアルスターカラー・ストームフラップ（ガンフラップ）・スロートラッチ・ダブルブレスト */
              <g>
                {/* 首元の黒タートルインナーとリブ縦畝 */}
                <path d="M 114 146 L 166 146 L 140 212 Z" fill="#09090b" />
                <line x1="132" y1="148" x2="136" y2="196" stroke="#27272a" strokeWidth="1" />
                <line x1="140" y1="148" x2="140" y2="202" stroke="#27272a" strokeWidth="1" />
                <line x1="148" y1="148" x2="144" y2="196" stroke="#27272a" strokeWidth="1" />
                {/* 左胸のガンフラップ（トレンチコート特有の覆い布） */}
                <polygon
                  points="68,166 116,160 126,232 72,218"
                  fill={palette.mid}
                  stroke={palette.deep}
                  strokeWidth="1.6"
                />
                <circle cx="88" cy="208" r="2.8" fill="#1c1917" stroke="#fca5a5" strokeWidth="0.9" />
                {/* 大きく立ち上がった赤いコートの左襟（鮮明な深紅ハイライト＋ステッチ） */}
                <path
                  d="M 94 136 L 116 144 L 140 230 L 100 214 L 84 174 L 96 162 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="2"
                />
                <path
                  d="M 97 140 L 114 146 L 136 221 L 102 209 L 88 174 L 99 162"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="1.2"
                  opacity="0.85"
                />
                {/* 襟元のスロートラッチ（チンストラップ＆金属バックル） */}
                <rect x="96" y="152" width="22" height="7" rx="1" fill={palette.collar} stroke="#09090b" strokeWidth="1.1" />
                <rect x="110" y="151" width="5" height="9" fill="none" stroke="#d6d3d1" strokeWidth="1.1" />
                {/* 赤いコートの右襟とストームケープ影（外胸の名札領域 x>=183 を覆わない設計） */}
                <path
                  d="M 184 136 L 164 144 L 134 230 L 176 214 L 188 174 L 178 162 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="2"
                />
                {/* ダブルブレストの重なり前立て・2列の飾りボタン・深いドレープ影 */}
                <path
                  d="M 132 228 L 122 390 L 128 390 L 138 228 Z"
                  fill="#09090b"
                />
                <circle cx="114" cy="246" r="3.8" fill="#1c1917" stroke="#fca5a5" strokeWidth="1.1" />
                <circle cx="112" cy="282" r="3.8" fill="#1c1917" stroke="#fca5a5" strokeWidth="1.1" />
                <circle cx="110" cy="318" r="3.8" fill="#1c1917" stroke="#fca5a5" strokeWidth="1.1" />
                <circle cx="152" cy="246" r="3.8" fill="#09090b" stroke="#7f1d1d" strokeWidth="1.1" />
                <circle cx="150" cy="282" r="3.8" fill="#09090b" stroke="#7f1d1d" strokeWidth="1.1" />
                <circle cx="148" cy="318" r="3.8" fill="#09090b" stroke="#7f1d1d" strokeWidth="1.1" />
              </g>
            ) : garmentType === 'DELIVERY_JACKET' ? (
              /* ★ 作業ブルゾン・配達員ジャケット（通達③等）：折り返し作業襟・胸ヨーク切替・比翼ジッパー・両胸フラップポケット */
              <g>
                {/* インナーのクルーネックTシャツと首元のリブ */}
                <path
                  d="M 114 148 Q 140 168 166 148 L 154 196 L 126 196 Z"
                  fill="#1c1917"
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                <path
                  d="M 117 151 Q 140 171 163 151"
                  fill="none"
                  stroke="#44403c"
                  strokeWidth="2"
                />
                {/* 肩〜胸を横断するワークジャケットのヨーク切り替え線と反射パイピング（肩縫い目に収まる） */}
                <path
                  d="M 66 184 L 120 194 M 160 194 L 214 184"
                  stroke={palette.deep}
                  strokeWidth="2"
                />
                <path
                  d="M 66 186 L 120 196 M 160 196 L 214 186"
                  stroke={palette.rim}
                  strokeWidth="1"
                  opacity="0.7"
                />
                {/* 作業ブルゾンの立体折り返し襟 */}
                <path
                  d="M 96 140 L 116 146 L 136 204 L 100 188 L 88 162 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 184 140 L 164 146 L 144 204 L 180 188 L 192 162 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                {/* 右胸の斜めフラップ付き作業ポケット＆ペン差しステッチ */}
                <polygon
                  points="74,202 112,206 112,240 74,236"
                  fill={palette.mid}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <polygon
                  points="72,200 114,204 112,216 74,212"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <circle cx="93" cy="211" r="2" fill="#a8a29e" stroke="#09090b" strokeWidth="0.7" />
                {/* 左胸（向かって右外側）の作業ポケット（名札の位置と合わせる） */}
                <polygon
                  points="174,206 210,202 210,236 174,240"
                  fill={palette.shadow}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <polygon
                  points="172,204 212,200 210,212 174,216"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                {/* フロントの比翼（ストームフラップ）＋金属ファスナーとスライダー引手 */}
                <rect
                  x="134"
                  y="192"
                  width="12"
                  height="198"
                  fill={palette.mid}
                  stroke={palette.deep}
                  strokeWidth="1.4"
                />
                <line x1="140" y1="192" x2="140" y2="390" stroke="#09090b" strokeWidth="2.4" />
                {/* 金属ファスナースライダー */}
                <rect x="137" y="200" width="6" height="10" rx="1" fill="#d6d3d1" stroke="#09090b" strokeWidth="0.9" />
              </g>
            ) : garmentType === 'LOUNGE_HOODIE' ? (
              /* ★ スウェットパーカー・部屋着（v-norm-3、猫背個体など）：ボリュームのある首回りフード・ハトメ穴・ドローコード紐・自然なラグラン袖線 */
              <g>
                {/* 緩いクルーネックインナー */}
                <path
                  d="M 112 146 Q 140 172 168 146 L 158 202 L 122 202 Z"
                  fill="#09090b"
                />
                {/* ラグランスリーブの自然な曲線シーム（脇下の境界へ滑らかに接続） */}
                <path
                  d="M 102 150 C 88 174, 76 196, 66 218 M 178 150 C 192 174, 204 196, 214 218"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <path
                  d="M 100 151 C 86 175, 74 196, 65 217"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="0.9"
                  opacity="0.35"
                />
                {/* 首回りにたまる多層フードの肉厚な布ヒダ */}
                <path
                  d="M 86 142 C 94 176, 118 198, 140 202 C 122 184, 112 164, 108 144 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 194 142 C 186 176, 162 198, 140 202 C 158 184, 168 164, 172 144 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.8"
                />
                <path
                  d="M 90 156 Q 112 182 136 192 M 190 156 Q 168 182 144 192"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.5"
                />
                {/* フードの金属ハトメ（アイレット）と垂れ下がる2本のドローコード（紐） */}
                <circle cx="122" cy="186" r="2.5" fill="#18181b" stroke="#a1a1aa" strokeWidth="1.1" />
                <circle cx="158" cy="186" r="2.5" fill="#18181b" stroke="#71717a" strokeWidth="1.1" />
                <path
                  d="M 122 188 C 120 212, 123 232, 121 254"
                  fill="none"
                  stroke="#d6d3d1"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 158 188 C 160 210, 157 228, 159 246"
                  fill="none"
                  stroke="#a8a29e"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* センタージップと胸〜腹部の柔らかい布のたるみシワ */}
                <line x1="140" y1="202" x2="140" y2="390" stroke="#09090b" strokeWidth="2.4" />
                <path
                  d="M 94 224 Q 118 242 136 236 M 98 258 Q 120 274 138 268 M 184 228 Q 162 244 144 238"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              </g>
            ) : (
              /* ★ オーバーコート・厚手チェスター（OVERCOAT_CARDIGAN）：深いバルマカーン襟・インナーニット・比翼ボタン・重厚な縦ドレープ */
              <g>
                {/* インナーのリブ編みタートル・モックネック */}
                <path
                  d="M 112 144 Q 140 164 168 144 L 154 218 L 126 218 Z"
                  fill="#18181b"
                  stroke="#09090b"
                  strokeWidth="1.2"
                />
                <line x1="130" y1="154" x2="133" y2="206" stroke="#27272a" strokeWidth="1.2" />
                <line x1="140" y1="156" x2="140" y2="212" stroke="#27272a" strokeWidth="1.2" />
                <line x1="150" y1="154" x2="147" y2="206" stroke="#27272a" strokeWidth="1.2" />
                {/* 大きく重厚なオーバーコートの左ラペル・カラー */}
                <path
                  d="M 94 140 L 116 146 L 140 232 L 104 214 L 90 174 L 100 160 Z"
                  fill={palette.light}
                  stroke={palette.deep}
                  strokeWidth="1.9"
                />
                <path
                  d="M 97 144 L 113 149 L 135 224 L 106 209 L 94 174 L 103 160"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="1"
                  opacity="0.75"
                />
                {/* 右ラペル・カラー（外胸の名札領域 x>=183 と重ならない端正な幅） */}
                <path
                  d="M 186 140 L 164 146 L 140 232 L 176 214 L 190 174 L 180 160 Z"
                  fill={palette.collar}
                  stroke={palette.deep}
                  strokeWidth="1.9"
                />
                {/* オーバーコートの前立て・水牛ボタン・深い縦ドレープ溝 */}
                <line x1="140" y1="228" x2="140" y2="390" stroke="#09090b" strokeWidth="2.8" />
                <circle cx="132" cy="252" r="3.6" fill="#09090b" stroke={palette.rim} strokeWidth="1" />
                <circle cx="132" cy="292" r="3.6" fill="#09090b" stroke={palette.rim} strokeWidth="1" />
                <circle cx="132" cy="332" r="3.6" fill="#09090b" stroke={palette.rim} strokeWidth="1" />
                <path
                  d="M 98 222 C 102 276, 100 332, 96 388 M 182 222 C 178 276, 180 332, 184 388"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.7"
                  opacity="0.78"
                />
              </g>
            )}

            {/* 3-E. 肩口・アームホール・脇下の自然な境界と控えめな生地シワ */}
            {garmentType !== 'LOUNGE_HOODIE' && (
              <g>
                {/* 肩先から脇へ自然に沿うアームホール（袖ぐり）の縫製線 */}
                <path
                  d="M 62 157 C 66 176, 68 198, 66 218 M 218 157 C 214 176, 212 198, 214 218"
                  fill="none"
                  stroke={palette.deep}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.72"
                />
                <path
                  d="M 60 158 C 64 177, 66 198, 64 217"
                  fill="none"
                  stroke={palette.rim}
                  strokeWidth="0.85"
                  opacity="0.35"
                />
              </g>
            )}
            {/* 脇下から裾へ落ちる腕と胴体の控えめな境界シャドウ */}
            <path
              d="M 66 218 C 62 248, 61 305, 65 390 L 70 390 C 67 305, 67 248, 68 218 Z"
              fill={palette.deep}
              opacity="0.56"
            />
            <path
              d="M 214 218 C 218 248, 219 305, 215 390 L 210 390 C 213 305, 213 248, 212 218 Z"
              fill={palette.deep}
              opacity="0.66"
            />
            {/* 身頃を不自然に分断しない、脇・肘内側の控えめな曲線シワ */}
            <path
              d="M 68 216 Q 76 226 83 232 M 66 232 Q 74 240 80 245 M 212 216 Q 204 226 197 232 M 214 232 Q 206 240 200 245"
              fill="none"
              stroke={palette.deep}
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.48"
            />
            <path
              d="M 48 248 Q 57 258 63 268 M 44 282 Q 55 292 63 302 M 232 248 Q 223 258 217 268 M 236 282 Q 225 292 217 302"
              fill="none"
              stroke={palette.deep}
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.42"
            />
            {/* 肩先から上腕へ走る生地の張力ハイライト線 */}
            <path
              d="M 46 184 C 42 216, 40 258, 40 308 M 56 186 C 54 218, 53 256, 54 298"
              fill="none"
              stroke={palette.rim}
              strokeWidth="0.95"
              strokeLinecap="round"
              opacity="0.36"
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
                3-F. 胸元の名札・IDカード（訪問者の外側左胸＝向かって右側胸ポケット付近 x=180〜210 に常時描画）
                初期隙間（12%）では閉まっている右側エレベーター扉の裏に物理的に完全遮蔽され、
                扉を約35%〜45%以上大きく開けた際に初めて隙間から物理的に露出する
                ============================================================ */}
            {appearance.hasNameTag && (
              <g transform="rotate(-2 195 214)">
                {/* 安全ピンで布地が引っ張られて寄る微小な布シワ影 */}
                <path
                  d="M 182 198 Q 195 202.5 208 198"
                  fill="none"
                  stroke="#050507"
                  strokeWidth="2"
                  opacity="0.85"
                />
                {/* IDカードの濃い落ち影 */}
                <rect
                  x="182"
                  y="207.5"
                  width="30"
                  height="21"
                  rx="1.6"
                  fill="#050507"
                />
                {/* IDカード本体（高コントラストなクリーム白＋アンバー枠） */}
                <rect
                  x="180"
                  y="205"
                  width="30"
                  height="21"
                  rx="1.6"
                  fill="#f5f5f4"
                  stroke="#f59e0b"
                  strokeWidth="1.7"
                />
                {/* カード上部の所属帯 */}
                <rect x="181" y="206" width="28" height="4.2" fill="#b45309" />
                {/* 証明写真の小枠（逆光シルエット顔） */}
                <rect x="183" y="212" width="7.5" height="10.5" fill="#1c1917" />
                <circle cx="186.75" cy="215.5" r="1.8" fill="#78716c" />
                <path d="M 183.8 222 C 184.5 218.8, 189 218.8, 189.7 222 Z" fill="#57534e" />
                {/* 氏名・バーコード線 */}
                <line x1="193" y1="214.2" x2="207" y2="214.2" stroke="#1c1917" strokeWidth="2" />
                <line x1="193" y1="218" x2="204.5" y2="218" stroke="#57534e" strokeWidth="1.5" />
                <line x1="193" y1="221.5" x2="206.5" y2="221.5" stroke="#78716c" strokeWidth="1.3" />

                {/* ★ 金属製「安全ピン（Safety Pin）」の精密ベクター描画 */}
                {/* ピンが服の布地を貫通している左右の刺し穴シャドウ */}
                <circle cx="187" cy="201" r="1.4" fill="#050507" />
                <circle cx="203" cy="201" r="1.4" fill="#050507" />
                {/* 右端のバネ巻き（コイルループ） */}
                <circle
                  cx="205.5"
                  cy="201.5"
                  r="2.1"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth="2.2"
                />
                <circle
                  cx="205.5"
                  cy="201.5"
                  r="2.1"
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth="1.2"
                />
                {/* 露出した銀色のピン軸 */}
                <line
                  x1="184.5"
                  y1="200.5"
                  x2="204.5"
                  y2="200.5"
                  stroke="#09090b"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <line
                  x1="184.5"
                  y1="200.5"
                  x2="204.5"
                  y2="200.5"
                  stroke="#f4f4f5"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                {/* カード上辺中央を挟む透明/金属タブ留め具 */}
                <rect
                  x="191.5"
                  y="201"
                  width="7"
                  height="5"
                  rx="1"
                  fill="#d4d4d8"
                  stroke="#09090b"
                  strokeWidth="0.9"
                />
                <circle cx="195" cy="203.5" r="1" fill="#27272a" />
                {/* 左端の安全ピン留め具ヘッド（クラスプキャップ）＋金属ハイライト */}
                <path
                  d="M 182 198.8 C 182 197.8, 186.5 197.8, 186.5 199.6 L 186.5 202.2 C 186.5 203.4, 182 203.4, 182 201.8 Z"
                  fill="#d4d4d8"
                  stroke="#09090b"
                  strokeWidth="1"
                />
                <line x1="183" y1="199.6" x2="185.5" y2="199.6" stroke="#ffffff" strokeWidth="0.85" />
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
                {/* 包丁を強く握りしめる節くれだった指（逆光シルエット） */}
                <path
                  d="M 8 52 C 8 46, 30 46, 30 53 C 30 66, 28 74, 14 74 C 8 72, 8 60, 8 52 Z"
                  fill="#18181b"
                  stroke="#050507"
                  strokeWidth="1.6"
                />
                <line x1="11" y1="57" x2="28" y2="57" stroke="#050507" strokeWidth="1.4" />
                <line x1="11" y1="63" x2="28" y2="63" stroke="#050507" strokeWidth="1.4" />
                <line x1="12" y1="69" x2="27" y2="69" stroke="#050507" strokeWidth="1.4" />
                {/* 刃先から滴る血の雫 */}
                <path d="M 12 -44 L 10 -54 L 14 -54 Z" fill="#ef4444" />
                <circle cx="12" cy="-58" r="2.2" fill="#dc2626" />
              </g>
            )}
          </g>

          {/* ============================================================
              4. 頭部：強い逆光シルエット（#0c0c0e〜#141418）＋暗がりから覗く目元＋髪型・眼鏡・帽子
              （クローン感の原因だった鼻筋・頬骨・眉間のシワ・厚い唇をすべて廃止）
              ============================================================ */}
          <g transform={headTransform}>
            {/* 4-A. 左右の耳の逆光シルエット（輪郭外縁のみ微かなリムライト） */}
            <g>
              <path
                d="M 103 74 C 95 72, 93 84, 96 93 C 98 99, 103 101, 106 98 Z"
                fill={faceSilhouetteBase}
                stroke="#050507"
                strokeWidth="1.4"
              />
              <path
                d="M 96 75 C 94 82, 95 89, 98 95"
                fill="none"
                stroke={faceRimLight}
                strokeWidth="1"
                opacity="0.55"
              />
              <path
                d="M 177 74 C 185 72, 187 84, 184 93 C 182 99, 177 101, 174 98 Z"
                fill={faceSilhouetteDeep}
                stroke="#050507"
                strokeWidth="1.4"
              />
            </g>

            {/* 4-B. 顔全体の逆光シルエット（#0c0c0e〜#141418 の深い影に沈む頭部輪郭） */}
            <path
              d={
                isKeyWoman
                  ? /* 女性的なシャープで繊細な顎・輪郭 */
                    'M 140 34 C 112 34, 101 54, 103 78 C 104 92, 107 103, 114 113 C 122 122, 133 128, 140 129 C 147 128, 158 122, 166 113 C 173 103, 176 92, 177 78 C 179 54, 168 34, 140 34 Z'
                  : appearance.silhouetteType === 'BROAD'
                  ? /* がっしりした骨格輪郭 */
                    'M 140 34 C 110 34, 99 52, 101 78 C 102 94, 104 108, 112 117 C 121 125, 131 129, 140 129 C 149 129, 159 125, 168 117 C 176 108, 178 94, 179 78 C 181 52, 170 34, 140 34 Z'
                  : /* 標準〜細身のシャープな頭部シルエット */
                    'M 140 33 C 111 33, 101 53, 102 78 C 103 92, 106 105, 113 115 C 121 124, 132 129, 140 130 C 148 129, 159 124, 167 115 C 174 105, 177 92, 178 78 C 179 53, 169 33, 140 33 Z'
              }
              fill={faceSilhouetteBase}
              stroke="#050507"
              strokeWidth="1.8"
            />

            {/* 顔面右半分〜顎下をさらに深い漆黒（#08080b）へ沈めるグラデーションなしの2トーン影 */}
            <path
              d="M 140 34 C 144 58, 144 96, 138 130 C 148 129, 159 124, 167 115 C 174 105, 177 92, 178 78 C 179 53, 169 34, 140 34 Z"
              fill={faceSilhouetteDeep}
              opacity="0.92"
            />

            {/* 廊下の天井灯による逆光リムハイライト（左側の輪郭縁・顎ラインにのみうっすら走る細い光線） */}
            <path
              d="M 103 74 C 104 90, 107 104, 114 114 C 121 122, 130 127, 139 129"
              fill="none"
              stroke={faceRimLight}
              strokeWidth={isKeyWoman ? '1.6' : '1.2'}
              opacity={appearance.isShadowedFace ? 0.25 : isKeyWoman ? 0.8 : 0.55}
            />
            <path
              d="M 177 82 C 175 96, 171 107, 165 115"
              fill="none"
              stroke={faceRimLight}
              strokeWidth="0.9"
              opacity="0.3"
            />

            {/* 4-C. 暗がりの中からこちらをじっと見据える目元（鼻筋・頬骨・シワを排し、視線の恐怖と人間味を際立たせる） */}
            {/* 眼窩のさらに深い暗がりベース */}
            <ellipse cx="123" cy="79" rx="12" ry="6.5" fill="#050507" />
            <ellipse cx="157" cy="79" rx="12" ry="6.5" fill="#050507" />

            {/* 2Fの彼女のみ：暗がりの中でわずかに浮かぶ切なげな眉のシルエット */}
            {isKeyWoman && (
              <g opacity="0.85">
                <path
                  d="M 113 72 Q 123 69 132 66"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <path
                  d="M 148 66 Q 157 69 167 72"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.4"
                />
              </g>
            )}

            {appearance.eyeStyle === 'NORMAL' && (
              <g opacity={appearance.isShadowedFace ? 0.45 : 1}>
                {/* 暗がりの中で鈍く浮かぶ細めの強膜（白目） */}
                <path
                  d="M 114 79 Q 123 74.5 132 79 Q 123 83.5 114 79 Z"
                  fill={isKeyWoman ? '#e2e8f0' : '#94a3b8'}
                  stroke="#050507"
                  strokeWidth="1.2"
                />
                <path
                  d="M 148 79 Q 157 74.5 166 79 Q 157 83.5 148 79 Z"
                  fill={isKeyWoman ? '#cbd5e1' : '#64748b'}
                  stroke="#050507"
                  strokeWidth="1.2"
                />
                {/* こちらをじっと見据える暗い虹彩と瞳孔 */}
                <circle cx="123" cy="79" r={isKeyWoman ? 3.1 : 2.6} fill="#09090b" />
                <circle cx="157" cy="79" r={isKeyWoman ? 3.1 : 2.6} fill="#09090b" />
                {/* 暗闇で光る微小なアイキャッチ */}
                <circle cx="122" cy="78" r={isKeyWoman ? 1.15 : 0.85} fill="#f8fafc" />
                <circle cx="156" cy="78" r={isKeyWoman ? 1.15 : 0.85} fill="#f8fafc" />
              </g>
            )}

            {appearance.eyeStyle === 'DEAD_DARK' && (
              <g opacity={appearance.isShadowedFace ? 0.5 : 1}>
                {/* 焦点の合わない濁った灰色の白目と極小の黒点 */}
                <path
                  d="M 113 79 Q 123 73.5 133 79 Q 123 84.5 113 79 Z"
                  fill="#6b7280"
                  stroke="#050507"
                  strokeWidth="1.3"
                />
                <circle cx="123" cy="79" r="1.3" fill="#000000" />
                <path
                  d="M 147 79 Q 157 73.5 167 79 Q 157 84.5 147 79 Z"
                  fill="#4b5563"
                  stroke="#050507"
                  strokeWidth="1.3"
                />
                <circle cx="157" cy="79" r="1.3" fill="#000000" />
              </g>
            )}

            {appearance.eyeStyle === 'HOLLOW' && (
              <g>
                {/* 異常個体：白目が完全に消失し、漆黒の眼窩の奥で白い点だけがぎょろりと光る */}
                <ellipse cx="123" cy="79" rx="11" ry="6" fill="#000000" />
                <ellipse cx="157" cy="79" rx="11" ry="6" fill="#000000" />
                {!appearance.isShadowedFace && (
                  <>
                    <circle cx="123" cy="79.5" r="1.5" fill="#f5f5f4" />
                    <circle cx="157" cy="79.5" r="1.5" fill="#f5f5f4" />
                  </>
                )}
                {appearance.hasBloodStains && (
                  <>
                    <path d="M 122 86 L 120 110 L 124 106 Z" fill="#991b1b" />
                    <path d="M 158 86 L 156 112 L 160 107 Z" fill="#991b1b" />
                  </>
                )}
              </g>
            )}

            {appearance.eyeStyle === 'GLOWING_RED' && (
              <g>
                {/* 異常個体：暗闇の顔の中で燃える真紅の眼光 */}
                <ellipse cx="123" cy="79" rx="11" ry="5.5" fill="#000000" />
                <ellipse cx="157" cy="79" rx="11" ry="5.5" fill="#000000" />
                <ellipse cx="123" cy="79" rx="6.2" ry="3" fill="#dc2626" />
                <circle cx="123" cy="79" r="1.6" fill="#fef2f2" />
                <ellipse cx="157" cy="79" rx="6.2" ry="3" fill="#dc2626" />
                <circle cx="157" cy="79" r="1.6" fill="#fef2f2" />
              </g>
            )}

            {appearance.eyeStyle === 'MULTIPLE' && (
              <g>
                <circle cx="122" cy="76" r="4.5" fill="#000000" />
                <circle cx="122" cy="76" r="2" fill="#ef4444" />
                <circle cx="158" cy="76" r="4.5" fill="#000000" />
                <circle cx="158" cy="76" r="2" fill="#ef4444" />
                <circle cx="140" cy="64" r="5" fill="#000000" />
                <circle cx="140" cy="64" r="2.2" fill="#ef4444" />
                <circle cx="116" cy="87" r="3.5" fill="#000000" />
                <circle cx="116" cy="87" r="1.5" fill="#f87171" />
                <circle cx="164" cy="87" r="3.5" fill="#000000" />
                <circle cx="164" cy="87" r="1.5" fill="#f87171" />
              </g>
            )}

            {/* 4-D. 訪問者固有の眼鏡（細いメタルフレームと暗がりの中で鈍く光るレンズ反射） */}
            {hasGlasses && (
              <g>
                {/* 左右のスクエア・ハーフリム風レンズ枠 */}
                <rect
                  x="110"
                  y="72"
                  width="25"
                  height="14"
                  rx="2"
                  fill="rgba(226, 232, 240, 0.06)"
                  stroke="#94a3b8"
                  strokeWidth="1.3"
                />
                <rect
                  x="145"
                  y="72"
                  width="25"
                  height="14"
                  rx="2"
                  fill="rgba(226, 232, 240, 0.04)"
                  stroke="#64748b"
                  strokeWidth="1.3"
                />
                {/* ブリッジとテンプル（つる） */}
                <line x1="135" y1="77" x2="145" y2="77" stroke="#94a3b8" strokeWidth="1.3" />
                <line x1="102" y1="76" x2="110" y2="77" stroke="#94a3b8" strokeWidth="1.2" />
                <line x1="170" y1="77" x2="178" y2="76" stroke="#64748b" strokeWidth="1.2" />
                {/* レンズ表面の斜め反射ハイライト線 */}
                <line
                  x1="113"
                  y1="83"
                  x2="120"
                  y2="74"
                  stroke="#e2e8f0"
                  strokeWidth="1.4"
                  opacity="0.55"
                />
                <line
                  x1="148"
                  y1="83"
                  x2="155"
                  y2="74"
                  stroke="#cbd5e1"
                  strokeWidth="1.4"
                  opacity="0.45"
                />
              </g>
            )}

            {/* 4-E. 口元（彫りの深い唇やほうれい線を廃止。通常時は暗がりに溶け込み、怪異時のみ不気味に裂ける） */}
            <g>
              {appearance.mouthStyle === 'NEUTRAL' && (
                /* 逆光の中でかすかに結ばれた細い一文字の影線のみ */
                <line
                  x1="133"
                  y1="108"
                  x2="147"
                  y2="108"
                  stroke="#27272a"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              )}

              {appearance.mouthStyle === 'SMILE' && (
                <path
                  d="M 130 106 Q 140 112 150 106"
                  fill="none"
                  stroke="#3f3f46"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              )}

              {appearance.mouthStyle === 'SMIRK' && (
                /* 暗がりの中で片側の口角だけが不自然に吊り上がる線 */
                <path
                  d="M 129 109 Q 141 110 154 102"
                  fill="none"
                  stroke="#52525b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}

              {appearance.mouthStyle === 'JAGGED_GRIN' && (
                <g>
                  {/* 暗闇の顔の中で耳元まで大きく裂けた怪異の口と白い歯列 */}
                  <path
                    d="M 116 101 Q 140 126 164 101 Q 140 111 116 101 Z"
                    fill="#000000"
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

            {/* 4-F. 訪問者ごとの多彩な髪型シルエット（逆光リムライト付き） */}
            {!appearance.hasCap && (
              <g>
                {hairType === 'KEY_WOMAN_LONG' && (
                  <g>
                    {/* 頭頂部から顔の輪郭両脇へ垂れ下がる美しい黒髪の束 */}
                    <path
                      d="M 140 25 C 108 25, 94 48, 95 82 C 96 114, 92 146, 86 178 L 102 166 C 104 134, 105 98, 108 72 C 115 62, 123 56, 134 48 C 138 58, 144 64, 150 54 C 159 60, 166 66, 172 74 C 175 98, 176 134, 178 166 L 194 178 C 188 146, 184 114, 185 82 C 186 48, 172 25, 140 25 Z"
                      fill="#09090b"
                      stroke="#27272a"
                      strokeWidth="1.1"
                    />
                    {/* 逆光を受ける頭頂〜左髪縁の繊細なリムハイライト */}
                    <path
                      d="M 110 42 C 122 32, 154 32, 168 42"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="1.6"
                      opacity="0.75"
                    />
                    {/* 顔の輪郭にかかるほつれ毛のシルエット */}
                    <path
                      d="M 118 52 C 113 64, 111 76, 114 92 M 164 52 C 169 64, 170 76, 166 92"
                      fill="none"
                      stroke="#050507"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {hairType === 'ANOMALY_WET_LONG' && (
                  <g>
                    {/* 顔面に不気味に張り付く濡れた黒髪の束 */}
                    <path
                      d="M 140 25 C 106 25, 94 48, 96 86 L 104 148 L 111 92 L 118 76 L 125 98 L 131 62 L 140 84 L 148 58 L 156 96 L 162 72 L 169 94 L 176 148 L 184 86 C 186 48, 174 25, 140 25 Z"
                      fill="#050507"
                      stroke="#18181b"
                      strokeWidth="0.9"
                    />
                  </g>
                )}

                {hairType === 'FEMALE_COAT_BOB' && (
                  <g>
                    {/* 丸みのある内巻きボブヘアのシルエット */}
                    <path
                      d="M 140 26 C 108 26, 95 48, 96 82 C 97 108, 102 128, 114 136 L 110 112 C 106 92, 106 72, 114 60 C 128 52, 152 54, 168 64 C 174 76, 174 96, 170 112 L 166 136 C 178 128, 183 108, 184 82 C 185 48, 172 26, 140 26 Z"
                      fill="#12100e"
                      stroke="#292524"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 112 40 Q 140 31 168 42"
                      fill="none"
                      stroke="#57534e"
                      strokeWidth="1.5"
                      opacity="0.65"
                    />
                  </g>
                )}

                {hairType === 'SHOULDER_LONG' && (
                  <g>
                    {/* センターパートのセミロング・ミディアムヘア（肩へ流れるシルエット） */}
                    <path
                      d="M 140 26 C 108 26, 95 48, 96 82 C 97 112, 94 138, 88 158 L 104 152 C 106 124, 106 92, 110 68 C 122 58, 134 50, 140 44 C 146 50, 158 58, 170 68 C 174 92, 174 124, 176 152 L 192 158 C 186 138, 183 112, 184 82 C 185 48, 172 26, 140 26 Z"
                      fill="#111115"
                      stroke="#27272a"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 114 38 Q 140 30 166 38"
                      fill="none"
                      stroke="#52525b"
                      strokeWidth="1.4"
                      opacity="0.6"
                    />
                  </g>
                )}

                {hairType === 'PARTED_NEAT' && (
                  <g>
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

                {hairType === 'SLICKED_BACK' && (
                  <g>
                    {/* オールバック・角刈り調のシャープな短髪シルエット（額が広く出た威圧的な輪郭） */}
                    <path
                      d="M 140 25 C 112 25, 98 42, 99 74 L 105 76 L 106 52 C 116 42, 164 42, 174 52 L 175 76 L 181 74 C 182 42, 168 25, 140 25 Z"
                      fill="#121216"
                      stroke="#27272a"
                      strokeWidth="1.2"
                    />
                    {/* オールバックの毛流れハイライト線 */}
                    <path
                      d="M 118 32 L 122 43 M 132 29 L 134 41 M 146 29 L 145 41 M 160 32 L 157 43"
                      stroke="#3f3f46"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {hairType === 'HEAVY_BANGS' && (
                  <g>
                    {/* 目元ギリギリまで重く垂れ下がるマッシュ・重め前髪シルエット */}
                    <path
                      d="M 140 25 C 108 25, 95 46, 97 78 L 105 76 L 107 66 L 116 72 L 124 66 L 136 73 L 144 67 L 156 73 L 166 66 L 173 72 L 175 76 L 183 78 C 185 46, 172 25, 140 25 Z"
                      fill="#111114"
                      stroke="#27272a"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 112 38 Q 140 31 168 38"
                      fill="none"
                      stroke="#3f3f46"
                      strokeWidth="1.4"
                      opacity="0.65"
                    />
                  </g>
                )}

                {(hairType === 'MESSY_SHORT' || hairType === 'HOODED_HUNCH') && (
                  <g>
                    {/* 無造作なボサボサ短髪外枠シルエット */}
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
          className={`relative z-10 flex flex-col items-center justify-end h-[90%] w-[85%] max-w-[330px] md:w-[72%] md:max-w-[600px] pointer-events-none ${glitchClass}`}
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

