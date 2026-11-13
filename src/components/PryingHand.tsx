import React from 'react';
import { motion } from 'framer-motion';

interface PryingHandProps {
  side: 'left' | 'right';
  closeClicksRemaining: number;
}

/**
 * 扉を無理やりこじ開けようとする怪異の手
 * - 左扉用と右扉用で個別に設計されたSVGパスを採用（CSS反転による崩れ・向きの違和感を完全排除）
 * - 中央の隙間（奥）から伸びた恐ろしい怪異の4本指が、扉のゴムパッキン・内側エッジを回り込んで
 *   エレベーター車内側（手前）のステンレス鋼板を鷲掴みにし、鋭利な漆黒の爪で強く引っかいている描写
 * - 爪が擦れて生じた金属削れの白い傷跡と、滴り落ちる暗赤色の血痕
 * - 閉ボタン連打時の衝撃痙攣と、怪力で引き裂こうとする微細な震えアニメーション
 */
export const PryingHand: React.FC<PryingHandProps> = React.memo(({ side, closeClicksRemaining }) => {
  const isLeft = side === 'left';

  return (
    <div
      className="absolute pointer-events-none z-30 select-none overflow-visible"
      style={{
        // 左手と右手で高さをずらして自然な人間の力比べの左右非対称性を表現
        top: isLeft ? '41%' : '48%',
        ...(isLeft
          ? {
              right: '-28px',
              transform: 'translate3d(0, -50%, 0)',
            }
          : {
              left: '-28px',
              transform: 'translate3d(0, -50%, 0)',
            }),
      }}
    >
      <motion.div
        key={closeClicksRemaining}
        className="w-[96px] h-[170px] sm:w-[124px] sm:h-[220px] overflow-visible"
        style={{ willChange: 'transform' }}
        initial={{
          scale: 1.08,
        }}
        animate={{
          scale: 1,
          x: isLeft ? [0, -1.8, 1, -1.2, 0.4, 0] : [0, 1.8, -1, 1.2, -0.4, 0],
          y: [0, 1.2, -0.8, 1, -0.5, 0],
          rotate: isLeft ? [0, -0.5, 0.4, -0.3, 0.1, 0] : [0, 0.5, -0.4, 0.3, -0.1, 0],
        }}
        transition={{
          duration: 0.16,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        {isLeft ? (
          /* ==========================================================
             【左扉用】隙間（右側 x=85〜115）から伸び、左扉表面（x=0〜85）を鷲掴む怪異の手
             ========================================================== */
          <svg
            viewBox="0 0 115 200"
            className="w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="prying-skin-left" x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stopColor="#090d16" />
                <stop offset="25%" stopColor="#1e293b" />
                <stop offset="55%" stopColor="#475569" />
                <stop offset="80%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              <linearGradient id="prying-claw-left" x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="40%" stopColor="#09090b" />
                <stop offset="85%" stopColor="#450a0a" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>

              <linearGradient id="prying-blood-left" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#991b1b" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#450a0a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 1. ステンレス鋼板の白い引っかき傷（爪が金属を削った跡） */}
            <g opacity="0.88">
              <path d="M 18 48 L 4 53 M 19 46 L 8 50" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 6 82 L -12 87 M 7 80 L -7 84 M 8 84 L -4 88" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 14 116 L 0 121 M 15 114 L 4 118" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 26 150 L 14 154 M 27 148 L 18 152" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
            </g>

            {/* 2. 扉を伝って垂れ落ちる暗赤色の血痕 */}
            <g>
              <path d="M 18 48 Q 17 62 18 76 Q 19 80 20 78 Q 20 64 19 49 Z" fill="url(#prying-blood-left)" />
              <path d="M 6 82 Q 4 105 6 128 Q 7 132 8 130 Q 8 107 7 83 Z" fill="url(#prying-blood-left)" />
              <path d="M 14 116 Q 13 132 14 148 Q 15 151 16 149 Q 15 133 15 117 Z" fill="url(#prying-blood-left)" />
              <circle cx="12" cy="88" r="1.8" fill="#7f1d1d" />
              <circle cx="-1" cy="86" r="1.4" fill="#991b1b" />
              <circle cx="20" cy="122" r="1.6" fill="#7f1d1d" />
            </g>

            {/* 3. 隙間（奥）から伸びる手首・手の付け根（x=85〜115） */}
            <path
              d="M 115 48 C 102 44 94 42 85 40 L 85 168 C 94 166 104 162 115 156 Z"
              fill="url(#prying-skin-left)"
            />
            {/* 浮き出た黒紫色の腱・血管 */}
            <path d="M 115 72 Q 98 68 85 70" stroke="#1e1b4b" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d="M 114 102 Q 100 104 85 98" stroke="#450a0a" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.9" />
            <path d="M 115 132 Q 98 128 85 130" stroke="#3b0764" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />

            {/* 4. 左扉の表面（x=0〜85）を鷲掴む4本の異形の指 */}
            {/* ① 人差し指（上部） */}
            <g>
              <path d="M 85 40 C 70 38 56 38 42 40 C 30 42 22 45 16 48 C 24 54 36 53 50 51 C 64 49 76 50 85 52 Z" fill="url(#prying-skin-left)" />
              <path d="M 84 43 C 68 41 54 41 40 43 C 28 45 20 48 16 49" stroke="#e2e8f0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.75" />
              <path d="M 58 40 Q 60 46 56 51 M 36 42 Q 38 48 34 53" stroke="#0f172a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M 18 47 C 10 49 6 51 4 54 C 9 56 14 56 18 57 C 16 53 16 49 18 47 Z" fill="url(#prying-claw-left)" />
            </g>

            {/* ② 中指（最長・深く食い込む） */}
            <g>
              <path d="M 85 64 C 66 61 50 61 34 63 C 18 66 10 72 4 78 C 14 86 28 84 46 81 C 62 79 74 81 85 82 Z" fill="url(#prying-skin-left)" />
              <path d="M 84 67 C 64 64 48 64 32 66 C 18 69 10 74 5 79" stroke="#f8fafc" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M 54 62 Q 56 71 52 79 M 28 65 Q 30 73 26 81" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 6 78 C -2 80 -6 82 -8 86 C -3 88 2 89 6 90 C 4 85 4 81 6 78 Z" fill="url(#prying-claw-left)" />
            </g>

            {/* ③ 薬指 */}
            <g>
              <path d="M 85 92 C 68 91 54 92 40 95 C 26 98 18 103 12 110 C 20 117 34 115 50 113 C 64 111 76 113 85 114 Z" fill="url(#prying-skin-left)" />
              <path d="M 84 95 C 66 94 52 95 38 98 C 26 101 18 105 13 111" stroke="#e2e8f0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M 54 93 Q 56 101 52 109 M 32 96 Q 34 104 30 112" stroke="#0f172a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M 14 109 C 6 111 2 114 0 117 C 5 119 10 120 14 121 C 12 116 12 112 14 109 Z" fill="url(#prying-claw-left)" />
            </g>

            {/* ④ 小指 */}
            <g>
              <path d="M 85 122 C 70 123 58 126 46 132 C 34 137 26 142 20 148 C 26 155 40 151 54 146 C 68 141 78 143 85 145 Z" fill="url(#prying-skin-left)" />
              <path d="M 84 125 C 68 126 56 129 44 135 C 32 140 26 144 21 149" stroke="#cbd5e1" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65" />
              <path d="M 52 127 Q 54 135 50 143 M 34 134 Q 36 142 32 149" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <path d="M 22 147 C 16 149 13 151 11 154 C 15 156 19 157 22 158 C 20 153 20 149 22 147 Z" fill="url(#prying-claw-left)" />
            </g>

            {/* 5. ドアエッジ（x=85）の立体的な影とゴムパッキンの食い込み */}
            <path d="M 83 34 L 87 34 L 87 170 L 83 170 Z" fill="#050505" opacity="0.75" />
            <path d="M 82 46 Q 85 50 82 56 M 82 72 Q 85 76 82 82 M 82 99 Q 85 103 82 110 M 82 128 Q 85 133 82 140" stroke="#000000" strokeWidth="2.8" fill="none" opacity="0.85" />
          </svg>
        ) : (
          /* ==========================================================
             【右扉用】隙間（左側 x=0〜30）から伸び、右扉表面（x=30〜115）を鷲掴む怪異の手
             ========================================================== */
          <svg
            viewBox="0 0 115 200"
            className="w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="prying-skin-right" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#090d16" />
                <stop offset="25%" stopColor="#1e293b" />
                <stop offset="55%" stopColor="#475569" />
                <stop offset="80%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              <linearGradient id="prying-claw-right" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="40%" stopColor="#09090b" />
                <stop offset="85%" stopColor="#450a0a" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>

              <linearGradient id="prying-blood-right" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#991b1b" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#450a0a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 1. ステンレス鋼板の白い引っかき傷（爪が金属を削った跡） */}
            <g opacity="0.88">
              <path d="M 97 48 L 111 53 M 96 46 L 107 50" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 109 82 L 127 87 M 108 80 L 122 84 M 107 84 L 119 88" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 101 116 L 115 121 M 100 114 L 111 118" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 89 150 L 101 154 M 88 148 L 97 152" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
            </g>

            {/* 2. 扉を伝って垂れ落ちる暗赤色の血痕 */}
            <g>
              <path d="M 97 48 Q 98 62 97 76 Q 96 80 95 78 Q 95 64 96 49 Z" fill="url(#prying-blood-right)" />
              <path d="M 109 82 Q 111 105 109 128 Q 108 132 107 130 Q 107 107 108 83 Z" fill="url(#prying-blood-right)" />
              <path d="M 101 116 Q 102 132 101 148 Q 100 151 99 149 Q 100 133 100 117 Z" fill="url(#prying-blood-right)" />
              <circle cx="103" cy="88" r="1.8" fill="#7f1d1d" />
              <circle cx="116" cy="86" r="1.4" fill="#991b1b" />
              <circle cx="95" cy="122" r="1.6" fill="#7f1d1d" />
            </g>

            {/* 3. 隙間（奥）から伸びる手首・手の付け根（x=0〜30） */}
            <path
              d="M 0 48 C 13 44 21 42 30 40 L 30 168 C 21 166 11 162 0 156 Z"
              fill="url(#prying-skin-right)"
            />
            {/* 浮き出た黒紫色の腱・血管 */}
            <path d="M 0 72 Q 17 68 30 70" stroke="#1e1b4b" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d="M 1 102 Q 15 104 30 98" stroke="#450a0a" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.9" />
            <path d="M 0 132 Q 17 128 30 130" stroke="#3b0764" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />

            {/* 4. 右扉の表面（x=30〜115）を鷲掴む4本の異形の指 */}
            {/* ① 人差し指（上部） */}
            <g>
              <path d="M 30 40 C 45 38 59 38 73 40 C 85 42 93 45 99 48 C 91 54 79 53 65 51 C 51 49 39 50 30 52 Z" fill="url(#prying-skin-right)" />
              <path d="M 31 43 C 47 41 61 41 75 43 C 87 45 95 48 99 49" stroke="#e2e8f0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.75" />
              <path d="M 57 40 Q 55 46 59 51 M 79 42 Q 77 48 81 53" stroke="#0f172a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M 97 47 C 105 49 109 51 111 54 C 106 56 101 56 97 57 C 99 53 99 49 97 47 Z" fill="url(#prying-claw-right)" />
            </g>

            {/* ② 中指（最長・深く食い込む） */}
            <g>
              <path d="M 30 64 C 49 61 65 61 81 63 C 97 66 105 72 111 78 C 101 86 87 84 69 81 C 53 79 41 81 30 82 Z" fill="url(#prying-skin-right)" />
              <path d="M 31 67 C 51 64 67 64 83 66 C 97 69 105 74 110 79" stroke="#f8fafc" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M 61 62 Q 59 71 63 79 M 87 65 Q 85 73 89 81" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 109 78 C 117 80 121 82 123 86 C 118 88 113 89 109 90 C 111 85 111 81 109 78 Z" fill="url(#prying-claw-right)" />
            </g>

            {/* ③ 薬指 */}
            <g>
              <path d="M 30 92 C 47 91 61 92 75 95 C 89 98 97 103 103 110 C 95 117 81 115 65 113 C 51 111 39 113 30 114 Z" fill="url(#prying-skin-right)" />
              <path d="M 31 95 C 49 94 63 95 77 98 C 89 101 97 105 102 111" stroke="#e2e8f0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M 61 93 Q 59 101 63 109 M 83 96 Q 81 104 85 112" stroke="#0f172a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M 101 109 C 109 111 113 114 115 117 C 110 119 105 120 101 121 C 103 116 103 112 101 109 Z" fill="url(#prying-claw-right)" />
            </g>

            {/* ④ 小指 */}
            <g>
              <path d="M 30 122 C 45 123 57 126 69 132 C 81 137 89 142 95 148 C 89 155 75 151 61 146 C 47 141 37 143 30 145 Z" fill="url(#prying-skin-right)" />
              <path d="M 31 125 C 47 126 59 129 71 135 C 83 140 89 144 94 149" stroke="#cbd5e1" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65" />
              <path d="M 63 127 Q 61 135 65 143 M 81 134 Q 79 142 83 149" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <path d="M 93 147 C 99 149 102 151 104 154 C 100 156 96 157 93 158 C 95 153 95 149 93 147 Z" fill="url(#prying-claw-right)" />
            </g>

            {/* 5. ドアエッジ（x=30）の立体的な影とゴムパッキンの食い込み */}
            <path d="M 28 34 L 32 34 L 32 170 L 28 170 Z" fill="#050505" opacity="0.75" />
            <path d="M 33 46 Q 30 50 33 56 M 33 72 Q 30 76 33 82 M 33 99 Q 30 103 33 110 M 33 128 Q 30 133 33 140" stroke="#000000" strokeWidth="2.8" fill="none" opacity="0.85" />
          </svg>
        )}
      </motion.div>
    </div>
  );
});
