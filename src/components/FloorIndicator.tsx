import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import type { GameState } from '../types/game';

interface FloorIndicatorProps {
  floor: number;
  gameState: GameState;
  sanity: number;
  maxSanity: number;
  complaints: number;
  maxComplaints: number;
  judgingTimeLeftMs: number;
  judgingMaxTimeMs: number;
  isSlowMotion: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const FloorIndicator: React.FC<FloorIndicatorProps> = React.memo(({
  floor,
  gameState,
  sanity,
  maxSanity,
  complaints,
  maxComplaints,
  judgingTimeLeftMs,
  judgingMaxTimeMs,
  isSlowMotion,
  isMuted,
  onToggleMute,
  isPaused,
  onTogglePause,
}) => {
  const isMoving = gameState === 'MOVING';
  const isJudging = gameState === 'JUDGING';
  const isDanger = complaints >= 2 || sanity <= 1;

  const formattedFloor =
    floor <= 0 ? 'B1F' : floor === 1 ? '1F' : `${String(floor).padStart(2, '0')}F`;
  const timeProgress = Math.max(0, Math.min(100, (judgingTimeLeftMs / judgingMaxTimeMs) * 100));
  const secondsLeft = (judgingTimeLeftMs / 1000).toFixed(1);

  const statusText =
    gameState === 'PREPARE'
      ? '【待機】命令通達査読'
      : gameState === 'MOVING'
      ? '【巡航】シャフト降下中'
      : gameState === 'ARRIVING'
      ? '【接車】扉隙間開放'
      : gameState === 'JUDGING'
      ? isSlowMotion
        ? `【検閲】文書照合中 (${secondsLeft}s)`
        : `【検閲】身元照合 (${secondsLeft}s)`
      : gameState === 'FINAL_DOOR'
      ? floor <= 0
        ? '【B1F非常口】手動開扉'
        : '【1F到着】手動開扉待機'
      : gameState === 'EVENT_RESULT'
      ? '【判定】処理実行中'
      : '【停止】待機状態';

  return (
    <header className="relative z-30 w-full md:h-14 mobile-landscape-header px-2 sm:px-2.5 md:px-3 pt-[max(env(safe-area-inset-top,0px),0.5rem)] pb-1.5 md:py-0 flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2 border-b border-stone-800 bg-stone-950/95 shrink-0 whitespace-nowrap">
      {/* モバイル縦画面用：1段目（精神・階数・通報・ポーズ・ミュート）＋2段目（ステータス＆タイマーバー） */}
      <div className="flex md:hidden items-center justify-between gap-1 w-full min-w-0">
        {/* 精神安定度 */}
        <div
          id="sanity-indicator-mobile"
          className="flex items-center gap-1 bg-black/80 border border-stone-800 px-1.5 py-1 rounded shrink-0"
        >
          <span className="text-[10px] font-bold text-stone-300">精神</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: maxSanity }).map((_, idx) => {
              const active = idx < sanity;
              return (
                <div
                  key={idx}
                  className={`w-3 h-2.5 rounded-xs border transition-all ${
                    active
                      ? sanity === 1
                        ? 'bg-red-500 border-red-300'
                        : 'bg-emerald-500 border-emerald-300'
                      : 'bg-stone-900 border-stone-800 opacity-35'
                  }`}
                />
              );
            })}
          </div>
          <span className="font-seven-seg text-[11px] text-stone-300">
            {sanity}/{maxSanity}
          </span>
        </div>

        {/* 中央：階数 */}
        <div className="flex items-center gap-1 bg-black/90 border border-stone-700/90 px-2.5 py-0.5 rounded shadow-inner shrink-0">
          <ArrowDown
            className={`w-3.5 h-3.5 ${isDanger ? 'text-red-500' : 'text-amber-500'}`}
          />
          <span
            className={`font-seven-seg text-lg font-bold tracking-wider ${
              isDanger ? 'led-red-glow' : 'led-amber-glow'
            }`}
          >
            {formattedFloor}
          </span>
        </div>

        {/* 右：通報＋操作アイコン */}
        <div className="flex items-center gap-1 shrink-0">
          <div
            id="complaint-lamps-mobile"
            className="flex items-center gap-1 bg-black/80 border border-stone-800 px-1.5 py-1 rounded"
          >
            <span className="text-[10px] font-bold text-stone-300">通報</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: maxComplaints }).map((_, idx) => {
                const isLit = idx < complaints;
                return (
                  <div
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full border ${
                      isLit
                        ? 'bg-red-600 border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.95)] animate-pulse'
                        : 'bg-stone-900 border-stone-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onTogglePause}
            disabled={gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR'}
            className={`p-1 rounded border cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                : 'bg-stone-900 border-stone-700 text-stone-300'
            } ${
              gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR'
                ? 'opacity-40 pointer-events-none'
                : ''
            }`}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1 rounded bg-stone-900 border border-stone-700 text-stone-300 cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* モバイル縦画面用：2段目（状態テキスト＋タイマーバー） */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <span
          className={`text-[10px] font-bold shrink-0 ${
            gameState === 'PREPARE'
              ? 'text-emerald-400'
              : isJudging
              ? isSlowMotion
                ? 'text-red-400 animate-pulse'
                : 'text-amber-400'
              : 'text-stone-400'
          }`}
        >
          {statusText}
        </span>
        <div className="flex-1 h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
          {isJudging ? (
            <div
              className={`h-full w-full origin-left will-change-transform transition-transform duration-75 ${
                isSlowMotion
                  ? 'bg-red-500'
                  : timeProgress < 30
                  ? 'bg-red-500'
                  : 'bg-amber-400'
              }`}
              style={{ transform: `scaleX(${timeProgress / 100})` }}
            />
          ) : (
            <div
              className={`h-full w-full ${
                gameState === 'PREPARE' ? 'bg-emerald-500/40' : 'bg-stone-800/50'
              }`}
            />
          )}
        </div>
      </div>

      {/* ============================================================
          デスクトップ・PC横画面用（md以上）：従来の1行コンパクトヘッダー
          ============================================================ */}
      {/* 左：精神安定度 ＋ 緑ゲージ (3/3) */}
      <div
        id="sanity-indicator"
        className="hidden md:flex items-center gap-2 bg-black/80 border border-stone-800 px-3 py-1.5 rounded whitespace-nowrap shrink-0"
      >
        <span className="text-xs font-bold text-stone-300 whitespace-nowrap">精神安定度</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxSanity }).map((_, idx) => {
            const active = idx < sanity;
            return (
              <div
                key={idx}
                className={`w-5 h-3 rounded-xs border transition-colors ${
                  active
                    ? sanity === 1
                      ? 'bg-red-500 border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                      : 'bg-emerald-500 border-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : 'bg-stone-900 border-stone-800 opacity-35'
                }`}
              />
            );
          })}
        </div>
        <span className="font-seven-seg text-xs text-stone-300 whitespace-nowrap">
          {sanity}/{maxSanity}
        </span>
      </div>

      {/* 中央：14F ＋ ステータス＆8秒タイマーバー */}
      <div className="hidden md:flex items-center gap-3 bg-black/90 border border-stone-700/90 px-3.5 py-1 rounded shadow-inner whitespace-nowrap shrink-0">
        {/* 下降矢印＋7セグ階層表示 */}
        <div className="flex items-center gap-1.5">
          <motion.div
            style={{ willChange: 'transform, opacity' }}
            animate={
              isMoving
                ? { y: [-4, 4], opacity: [0.35, 1, 0.35] }
                : { y: 0, opacity: 0.85 }
            }
            transition={
              isMoving
                ? { duration: 0.65, repeat: Infinity, ease: 'linear' }
                : { duration: 0.2 }
            }
          >
            <ArrowDown
              className={`w-4 h-4 ${
                isDanger ? 'text-red-500' : 'text-amber-500'
              }`}
            />
          </motion.div>
          <span
            id="floor-display"
            className={`font-seven-seg text-2xl font-bold tracking-wider whitespace-nowrap ${
              isDanger ? 'led-red-glow' : 'led-amber-glow'
            }`}
          >
            {formattedFloor}
          </span>
        </div>

        {/* ステータス＆8秒タイマーバー */}
        <div className="flex flex-col justify-center w-36 sm:w-44">
          <div className="flex items-center justify-between text-[11px] leading-none mb-1 whitespace-nowrap">
            <span
              className={`font-bold whitespace-nowrap ${
                gameState === 'PREPARE'
                  ? 'text-emerald-400'
                  : isJudging
                  ? isSlowMotion
                    ? 'text-red-400 animate-pulse'
                    : 'text-amber-400'
                  : 'text-stone-400'
              }`}
            >
              {statusText}
            </span>
          </div>
          <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
            {isJudging ? (
              <div
                className={`h-full w-full origin-left will-change-transform transition-transform duration-75 ${
                  isSlowMotion
                    ? 'bg-red-500'
                    : timeProgress < 30
                    ? 'bg-red-500'
                    : 'bg-amber-400'
                }`}
                style={{ transform: `scaleX(${timeProgress / 100})` }}
              />
            ) : (
              <div
                className={`h-full w-full ${
                  gameState === 'PREPARE' ? 'bg-emerald-500/40' : 'bg-stone-800/50'
                }`}
              />
            )}
          </div>
        </div>
      </div>

      {/* 右：通報累積 ＋ 赤ランプ (0/3) ＋ ミュート */}
      <div className="hidden md:flex items-center gap-2 shrink-0 whitespace-nowrap">
        <div
          id="complaint-lamps"
          className="flex items-center gap-2 bg-black/80 border border-stone-800 px-3 py-1.5 rounded whitespace-nowrap"
        >
          <span className="text-xs font-bold text-stone-300 whitespace-nowrap">通報累積</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxComplaints }).map((_, idx) => {
              const isLit = idx < complaints;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                    isLit
                      ? 'bg-red-600 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.95)] animate-pulse'
                      : 'bg-stone-900 border-stone-700'
                  }`}
                />
              );
            })}
          </div>
          <span className="font-seven-seg text-xs text-stone-300 whitespace-nowrap">
            {complaints}/{maxComplaints}
          </span>
        </div>

        <button
          id="pause-toggle-btn"
          type="button"
          onClick={onTogglePause}
          disabled={gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR'}
          title={isPaused ? 'ゲームを再開する' : '一時停止する'}
          className={`p-1.5 rounded border transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
            isPaused
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
          } ${
            gameState === 'TITLE' || gameState === 'GAMEOVER' || gameState === 'CLEAR'
              ? 'opacity-40 cursor-not-allowed pointer-events-none'
              : ''
          }`}
        >
          {isPaused ? (
            <Play className="w-4 h-4 fill-current text-emerald-400" />
          ) : (
            <Pause className="w-4 h-4 text-amber-400" />
          )}
        </button>

        <button
          id="mute-toggle-btn"
          type="button"
          onClick={onToggleMute}
          title={isMuted ? '音声をONにする' : '音声をミュートする'}
          className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors cursor-pointer shrink-0"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
});
