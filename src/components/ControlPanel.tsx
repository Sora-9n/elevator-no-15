import React from 'react';
import { motion } from 'framer-motion';
import { Fan, BellRing, Play } from 'lucide-react';
import type { ActivePassenger, GameState, MovingCabinEvent } from '../types/game';

interface ControlPanelProps {
  floor: number;
  gameState: GameState;
  doorOpenPercent: number;
  isHoldingOpen: boolean;
  onStartDescent: () => void;
  onStartHoldOpen: () => void;
  onStopHoldOpen: () => void;
  onPressClose: () => void;
  closeClicksRemaining: number;
  requiredCloseClicks: number;
  isFanOn: boolean;
  onToggleFan: () => void;
  onPressBell: () => void;
  activePassengers: ActivePassenger[];
  movingEvent: MovingCabinEvent | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  floor,
  gameState,
  doorOpenPercent,
  isHoldingOpen,
  onStartDescent,
  onStartHoldOpen,
  onStopHoldOpen,
  onPressClose,
  closeClicksRemaining,
  requiredCloseClicks,
  isFanOn,
  onToggleFan,
  onPressBell,
  activePassengers,
  movingEvent,
}) => {
  const isPrepare = gameState === 'PREPARE';
  const isJudging = gameState === 'JUDGING';
  const isMoving = gameState === 'MOVING';

  // 12% → 100% までの長押し進捗率（0%〜100%）
  const openHoldProgress = isJudging
    ? Math.max(0, Math.min(100, ((doorOpenPercent - 12) / 88) * 100))
    : doorOpenPercent >= 100
    ? 100
    : 0;

  // 現在未達成の車内リクエストがあるか確認
  const pendingRequest = activePassengers.find(
    (p) => p.pendingRequest && !p.requestFulfilled
  )?.pendingRequest;

  const isActiveEvent = isMoving && movingEvent?.status === 'ACTIVE';
  const needFanAction =
    (isActiveEvent && movingEvent?.requiredAction === 'FAN') ||
    (isMoving && pendingRequest?.requiredAction === 'FAN');
  const needCloseAction =
    (isActiveEvent && movingEvent?.requiredAction === 'CLOSE') ||
    (isMoving && pendingRequest?.requiredAction === 'CLOSE');
  const needBellAction = isActiveEvent && movingEvent?.requiredAction === 'BELL';

  return (
    <aside className="w-full h-full flex flex-col justify-between p-2.5 metal-panel-surface border-l border-stone-800/90 relative z-20 select-none overflow-hidden">
      {/* 上部：PREPARE時のみ強調表示される「▼ 下降を開始/再開する」ボタン */}
      <div className="shrink-0">
        <motion.button
          id="btn-start-descent"
          type="button"
          disabled={!isPrepare}
          onClick={onStartDescent}
          whileTap={isPrepare ? { scale: 0.97 } : undefined}
          className={`w-full py-3 px-2.5 rounded border-2 flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm tracking-wider transition-all whitespace-nowrap ${
            isPrepare
              ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.65)] animate-pulse cursor-pointer'
              : 'bg-stone-900/50 border-stone-800 text-stone-600 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current rotate-90 shrink-0" />
          <span>{floor === 15 ? '▼ 下降開始 (着務)' : '▼ 下降再開 (継続)'}</span>
        </motion.button>
      </div>

      {/* 中央：開 (OPEN) ＆ 閉 (CLOSE) ボタン */}
      <div className="flex-1 flex flex-col justify-center gap-3 my-2 min-h-0">
        {/* ＜＞ 開 (OPEN) ボタン（長押しゲージ付き） */}
        <div className="flex flex-col gap-1">
          <motion.button
            id="btn-door-open"
            type="button"
            disabled={!isJudging}
            onPointerDown={(e) => {
              e.preventDefault();
              if (isJudging) onStartHoldOpen();
            }}
            onPointerUp={onStopHoldOpen}
            onPointerLeave={onStopHoldOpen}
            onPointerCancel={onStopHoldOpen}
            onContextMenu={(e) => e.preventDefault()}
            whileTap={isJudging ? { scale: 0.97 } : undefined}
            className={`relative w-full py-3.5 px-2.5 rounded border-2 flex flex-col items-center justify-center gap-1 transition-all overflow-hidden whitespace-nowrap touch-hold-btn select-none ${
              !isJudging
                ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                : isHoldingOpen
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.5)] cursor-pointer'
                : 'bg-stone-900 hover:bg-stone-800 border-stone-600 text-stone-100 shadow-md cursor-pointer'
            }`}
          >
            {/* 長押し充填プログレス背景 */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-emerald-500/30 transition-all duration-75 pointer-events-none"
              style={{ width: `${openHoldProgress}%` }}
            />

            <span className="relative z-10 text-sm sm:text-base font-mincho font-black tracking-widest whitespace-nowrap">
              ＜＞ 開扉
            </span>
            <span className="relative z-10 text-[11px] text-stone-300 whitespace-nowrap">
              長押し：隙間拡大 / 乗車認可
            </span>
          </motion.button>

          {/* 長押しゲージバー（深覗きポイント目盛り付き） */}
          <div className="relative w-full bg-stone-950 border border-stone-800 h-2.5 rounded-xs overflow-hidden p-0.5">
            <div
              className={`h-full transition-all duration-75 ${
                doorOpenPercent >= 65
                  ? 'bg-gradient-to-r from-amber-400 to-emerald-300'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ width: `${openHoldProgress}%` }}
            />
            {/* 覗き込み変化ライン目盛り */}
            <div
              title="身元照合ライン"
              className="absolute top-0 bottom-0 w-0.5 bg-amber-300/80 z-10"
              style={{ left: '60.2%' }}
            />
          </div>
        </div>

        {/* ＞＜ 閉扉 ボタン */}
        <motion.button
          id="btn-door-close"
          type="button"
          disabled={!isJudging && !isMoving}
          onClick={onPressClose}
          whileTap={isJudging || isMoving ? { scale: 0.95 } : undefined}
          className={`w-full py-3.5 px-2.5 rounded border-2 flex flex-col items-center justify-center gap-1 transition-all whitespace-nowrap ${
            !isJudging && !isMoving
              ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
              : needCloseAction
              ? 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.65)] animate-pulse cursor-pointer'
              : isJudging && requiredCloseClicks > 1 && closeClicksRemaining > 0
              ? 'bg-red-950 border-red-500 text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.75)] cursor-pointer'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-600 text-stone-100 shadow-md cursor-pointer'
          }`}
        >
          <span className="text-sm sm:text-base font-mincho font-black tracking-widest whitespace-nowrap">
            ＞＜ 閉扉
          </span>
          <span className="text-[11px] text-stone-300 whitespace-nowrap">
            {needCloseAction
              ? '★閉扉要求 (応諾)'
              : isJudging && requiredCloseClicks > 1
              ? `★抉開抵抗！残${closeClicksRemaining}回連打`
              : '押下：強制閉扉 / 遮断排除'}
          </span>
        </motion.button>
      </div>

      {/* 下部：小さく2列で「急速換気」と「非常ベル」 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 shrink-0">
        <button
          id="btn-cabin-fan"
          type="button"
          onClick={onToggleFan}
          className={`py-2 px-1.5 rounded border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer whitespace-nowrap ${
            needFanAction && !isFanOn
              ? 'bg-purple-950/95 border-purple-400 text-purple-100 shadow-[0_0_18px_rgba(168,85,247,0.85)] animate-pulse'
              : isFanOn
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.65)]'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
          }`}
        >
          <div className="flex items-center gap-1">
            <Fan
              className={`w-3.5 h-3.5 shrink-0 ${
                isFanOn
                  ? 'text-emerald-300 animate-spin'
                  : needFanAction
                  ? 'text-purple-300 animate-spin'
                  : 'text-stone-400'
              }`}
              style={{ animationDuration: isFanOn ? '0.35s' : '1.4s' }}
            />
            <span className="text-xs font-bold">急速換気</span>
          </div>
          <span className="text-[10px] font-mono opacity-85">
            {isFanOn
              ? '強制排気稼働中'
              : needFanAction
              ? '★急速排気起動'
              : '車内強制排気'}
          </span>
        </button>

        <button
          id="btn-emergency-bell"
          type="button"
          onClick={onPressBell}
          className={`py-2 px-1.5 rounded border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer whitespace-nowrap ${
            needBellAction
              ? 'bg-red-900/95 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.95)] animate-pulse'
              : 'border-red-900/80 bg-stone-950 hover:bg-red-950/70 active:scale-95 text-red-300'
          }`}
        >
          <div className="flex items-center gap-1">
            <BellRing
              className={`w-3.5 h-3.5 shrink-0 ${
                needBellAction ? 'text-white animate-bounce' : 'text-red-500'
              }`}
            />
            <span className="text-xs font-bold">非常ベル</span>
          </div>
          <span className="text-[10px] font-mono opacity-90">
            {needBellAction ? '★非常停止・排除' : '非常停止/威嚇'}
          </span>
        </button>
      </div>
    </aside>
  );
};
