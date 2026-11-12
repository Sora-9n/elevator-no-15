import React from 'react';
import { motion } from 'framer-motion';

interface PryingHandProps {
  side: 'left' | 'right';
  closeClicksRemaining: number;
}

/**
 * 扉をこじ開けようとする怪異の手
 * - 左右の扉の内側エッジ（中央の合わせ目）に直接取り付けられ、扉の開閉・振動と完全に同期
 * - ドアの隙間（奥）から腕が伸び、指先が金属扉の表面（手前）を掴んで内側に食い込んでいる立体的な恐怖描写
 * - 爪による金属の引っかき傷、血痕、関節のシワ、黒く変色した爪を精密に描画
 * - 閉ボタン連打時の衝撃痙攣アニメーション
 */
export const PryingHand: React.FC<PryingHandProps> = ({ side, closeClicksRemaining }) => {
  const isLeft = side === 'left';

  return (
    <div
      className="absolute pointer-events-none z-30 overflow-visible select-none"
      style={{
        // 左扉は上め（43%）、右扉は下め（49%）に配置して自然な人間・怪異の力比べの左右非対称性を表現
        top: isLeft ? '43%' : '49%',
        ...(isLeft
          ? {
              right: 0,
              transform: 'translateY(-50%) translateX(26.92%)',
            }
          : {
              left: 0,
              transform: 'translateY(-50%) translateX(-26.92%) scaleX(-1)',
            }),
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.8,
          transition: { duration: 0.15 },
        }}
      >
      {/* 怪異の腕の激しい抵抗・緊張の微細な振動（身悶えと怪力の震え） */}
      <motion.div
        key={closeClicksRemaining}
        className="w-[96px] h-[165px] sm:w-[126px] sm:h-[215px]"
        initial={{
          scale: 1.08,
          filter: 'brightness(1.4) drop-shadow(0 0 18px rgba(220,38,38,0.95)) drop-shadow(0 4px 14px rgba(0,0,0,0.95))',
        }}
        animate={{
          scale: 1,
          x: isLeft ? [0, -2, 1, -1.5, 0.5, 0] : [0, 2, -1, 1.5, -0.5, 0],
          y: [0, 1.5, -1, 1, -0.5, 0],
          rotate: isLeft ? [0, -0.6, 0.5, -0.4, 0.2, 0] : [0, 0.6, -0.5, 0.4, -0.2, 0],
          filter:
            'brightness(1) drop-shadow(0 0 10px rgba(185,28,28,0.65)) drop-shadow(0 4px 14px rgba(0,0,0,0.95))',
        }}
        transition={{
          duration: 0.16,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        <svg
          viewBox="0 0 130 220"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 青黒く腐食・変色した怪異の死肉グラデーション */}
            <linearGradient id={`prying-skin-${side}`} x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="18%" stopColor="#1e293b" />
              <stop offset="42%" stopColor="#334155" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="86%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* 黒ずんで鋭利に尖った獣・悪鬼の爪グラデーション */}
            <linearGradient id={`prying-claw-${side}`} x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="35%" stopColor="#18181b" />
              <stop offset="75%" stopColor="#09090b" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* 扉に擦れ落ちる暗赤色の血痕グラデーション */}
            <linearGradient id={`prying-blood-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#991b1b" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#450a0a" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ========================================================
              1. 爪によるステンレス扉表面の引っかき傷（金属の削れ）
              ======================================================== */}
          <g opacity="0.9">
            {/* 親指周辺の傷 */}
            <path
              d="M 14 50 L 3 56 M 15 48 L 6 53 M 16 52 L 8 57"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* 人差し指周辺の傷 */}
            <path
              d="M 2 82 L -9 85 M 3 80 L -6 83 M 4 84 L -4 87"
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* 中指周辺の深い傷 */}
            <path
              d="M -8 107 L -22 112 M -7 104 L -18 108 M -6 110 L -16 114"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* 薬指周辺の傷 */}
            <path
              d="M 0 134 L -10 138 M 1 132 L -8 136"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* 小指周辺の傷 */}
            <path
              d="M 10 170 L 1 173 M 11 168 L 3 171"
              stroke="#ffffff"
              strokeWidth="1.1"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>

          {/* ========================================================
              2. 爪が擦れて流れる血痕（ステンレスを伝う血糊）
              ======================================================== */}
          <g>
            {/* 人差し指からの血 */}
            <path
              d="M 2 82 Q 1 95 2 108 Q 3 112 4 109 Q 4 97 3 83 Z"
              fill={`url(#prying-blood-${side})`}
            />
            {/* 中指からの濃い血の垂れ */}
            <path
              d="M -8 107 Q -10 128 -8 150 Q -7 154 -6 152 Q -7 132 -6 109 Z"
              fill={`url(#prying-blood-${side})`}
            />
            {/* 薬指からの血 */}
            <path
              d="M 0 134 Q -1 148 0 162 Q 1 165 2 163 Q 1 151 1 135 Z"
              fill={`url(#prying-blood-${side})`}
            />
            {/* 飛び散った血痕 */}
            <circle cx="16" cy="85" r="1.5" fill="#450a0a" />
            <circle cx="6" cy="112" r="2.2" fill="#7f1d1d" />
            <circle cx="-3" cy="109" r="1.6" fill="#991b1b" />
            <circle cx="-14" cy="116" r="1.2" fill="#991b1b" />
            <circle cx="14" cy="139" r="1.8" fill="#7f1d1d" />
          </g>

          {/* ========================================================
              3. 手の甲・手首（暗い隙間 x=130 から扉エッジ x=95 へ侵入）
              ======================================================== */}
          {/* 手首・手の甲の肉 */}
          <path
            d="M 130 65 C 114 56 104 50 95 46 L 95 174 C 106 176 118 174 130 166 Z"
            fill={`url(#prying-skin-${side})`}
          />

          {/* 浮き出た黒紫色の腱と血管 */}
          <path
            d="M 129 86 Q 112 80 96 84"
            stroke="#1e1b4b"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 127 114 Q 114 118 97 110"
            stroke="#450a0a"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M 128 142 Q 110 136 96 138"
            stroke="#3b0764"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* 白っぽい骨の隆起（伸筋腱） */}
          <path
            d="M 130 76 L 95 70 M 130 98 L 95 94 M 130 126 L 95 120"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* ========================================================
              4. 扉を鷲掴みにする5本の異形の指
              ======================================================== */}

          {/* ① 親指（上部で扉を抑え込む） */}
          <g>
            {/* 指の肉 */}
            <path
              d="M 95 46 C 82 34 70 24 56 22 C 42 20 32 30 24 40 C 34 44 46 42 64 42 C 78 42 88 44 95 54 Z"
              fill={`url(#prying-skin-${side})`}
            />
            {/* 関節の骨のハイライト */}
            <path
              d="M 92 48 C 76 38 66 32 54 30 C 42 28 34 34 26 42"
              stroke="#cbd5e1"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* 関節のシワ */}
            <path
              d="M 58 26 Q 60 36 56 42"
              stroke="#0f172a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* 鋭い黒爪 */}
            <path
              d="M 26 40 C 18 43 14 46 12 50 C 17 52 22 53 25 54 C 23 48 24 43 26 40 Z"
              fill={`url(#prying-claw-${side})`}
            />
            <path
              d="M 25 42 L 14 50"
              stroke="#fca5a5"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>

          {/* ② 人差し指 */}
          <g>
            {/* 指の肉 */}
            <path
              d="M 95 62 C 78 58 66 58 48 60 C 32 62 22 68 12 74 C 22 83 38 80 56 78 C 70 76 84 78 95 80 Z"
              fill={`url(#prying-skin-${side})`}
            />
            {/* 骨・腱のハイライト */}
            <path
              d="M 94 66 C 76 63 64 63 48 65 C 34 67 24 71 16 76"
              stroke="#e2e8f0"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* 関節のシワ */}
            <path
              d="M 64 62 Q 66 70 62 76"
              stroke="#0f172a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 38 64 Q 40 72 36 78"
              stroke="#0f172a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* 鋭い黒爪 */}
            <path
              d="M 14 74 C 7 76 3 79 1 82 C 6 84 11 85 13 86 C 11 81 12 77 14 74 Z"
              fill={`url(#prying-claw-${side})`}
            />
            <path
              d="M 13 76 L 3 82"
              stroke="#fca5a5"
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>

          {/* ③ 中指（最も長く、深く金属に食い込んでいる） */}
          <g>
            {/* 指の肉 */}
            <path
              d="M 95 84 C 74 81 58 80 40 82 C 22 84 12 90 2 97 C 14 107 30 104 50 102 C 68 100 82 101 95 103 Z"
              fill={`url(#prying-skin-${side})`}
            />
            {/* 骨・腱のハイライト */}
            <path
              d="M 94 88 C 72 85 56 85 38 87 C 22 89 13 94 5 99"
              stroke="#f8fafc"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* 関節のシワ */}
            <path
              d="M 58 83 Q 60 92 56 100"
              stroke="#0f172a"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 30 85 Q 32 94 28 102"
              stroke="#0f172a"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* 鋭利な長爪 */}
            <path
              d="M 4 97 C -3 99 -7 102 -9 106 C -4 108 1 109 4 110 C 2 105 3 100 4 97 Z"
              fill={`url(#prying-claw-${side})`}
            />
            <path
              d="M 3 99 L -7 106"
              stroke="#fca5a5"
              strokeWidth="1.1"
              strokeLinecap="round"
              opacity="0.65"
            />
          </g>

          {/* ④ 薬指 */}
          <g>
            {/* 指の肉 */}
            <path
              d="M 95 108 C 76 106 62 106 44 109 C 30 112 20 117 10 124 C 20 132 36 129 56 127 C 72 125 84 127 95 128 Z"
              fill={`url(#prying-skin-${side})`}
            />
            {/* 骨・腱のハイライト */}
            <path
              d="M 94 112 C 74 110 60 110 44 113 C 30 116 20 120 12 126"
              stroke="#e2e8f0"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* 関節のシワ */}
            <path
              d="M 60 109 Q 62 117 58 125"
              stroke="#0f172a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 34 111 Q 36 119 32 127"
              stroke="#0f172a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* 鋭い黒爪 */}
            <path
              d="M 12 124 C 5 126 1 129 -1 133 C 3 135 8 136 10 137 C 9 132 10 127 12 124 Z"
              fill={`url(#prying-claw-${side})`}
            />
            <path
              d="M 11 126 L 1 133"
              stroke="#fca5a5"
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>

          {/* ⑤ 小指 */}
          <g>
            {/* 指の肉 */}
            <path
              d="M 95 134 C 78 135 66 138 50 144 C 36 149 28 154 18 161 C 26 168 42 164 60 159 C 76 154 86 155 95 157 Z"
              fill={`url(#prying-skin-${side})`}
            />
            {/* 骨・腱のハイライト */}
            <path
              d="M 94 138 C 76 139 64 142 50 147 C 36 152 28 157 20 163"
              stroke="#cbd5e1"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.65"
            />
            {/* 関節のシワ */}
            <path
              d="M 58 141 Q 60 149 56 157"
              stroke="#0f172a"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 36 148 Q 38 156 34 163"
              stroke="#0f172a"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            {/* 鋭い黒爪 */}
            <path
              d="M 20 161 C 14 163 11 166 9 169 C 13 171 16 172 18 173 C 17 168 18 164 20 161 Z"
              fill={`url(#prying-claw-${side})`}
            />
            <path
              d="M 19 163 L 11 169"
              stroke="#fca5a5"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>

          {/* ========================================================
              5. 扉の厚みエッジ（x=95）を回り込む立体的な影とゴム擦れ
              ======================================================== */}
          {/* ドアエッジの境目（指が90度曲がって奥から手前へ回り込む立体感） */}
          <path
            d="M 93 36 L 97 36 L 97 176 L 93 176 Z"
            fill="#050505"
            opacity="0.65"
          />
          {/* ゴムパッキンの食い込みシャドウ */}
          <path
            d="M 92 52 Q 95 56 92 64 M 92 78 Q 95 82 92 88 M 92 101 Q 95 106 92 112 M 92 126 Q 95 131 92 138"
            stroke="#000000"
            strokeWidth="2.5"
            fill="none"
            opacity="0.85"
          />
        </svg>
      </motion.div>
      </motion.div>
    </div>
  );
};
