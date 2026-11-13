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
  const isFinalDoor = gameState === 'FINAL_DOOR';
  const isMoving = gameState === 'MOVING';
  const canHoldOpen = isJudging || isFinalDoor;
  const isUrgentClose =
    (isJudging && requiredCloseClicks > 1 && closeClicksRemaining > 0) ||
    (isJudging && floor === 2);

  // 12% → 100% までの長押し進捗率（FINAL_DOOR時は 0% → 100%）
  const openHoldProgress = isFinalDoor
    ? Math.max(0, Math.min(100, doorOpenPercent))
    : isJudging
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
            disabled={!canHoldOpen}
            onPointerDown={(e) => {
              e.preventDefault();
              if (canHoldOpen) onStartHoldOpen();
            }}
            onPointerUp={onStopHoldOpen}
            onPointerLeave={onStopHoldOpen}
            onPointerCancel={onStopHoldOpen}
            onContextMenu={(e) => e.preventDefault()}
            animate={
              isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                ? {
                    scale: [1, 1.03, 1],
                    boxShadow: [
                      '0 0 14px rgba(245,158,11,0.65)',
                      '0 0 28px rgba(16,185,129,0.9)',
                      '0 0 14px rgba(245,158,11,0.65)',
                    ],
                  }
                : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }
            }
            transition={
              isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                ? { duration: 0.75, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            whileTap={canHoldOpen ? { scale: 0.97 } : undefined}
            className={`relative w-full py-3.5 px-2.5 rounded border-2 flex flex-col items-center justify-center gap-1 transition-all overflow-hidden whitespace-nowrap touch-hold-btn select-none ${
              !canHoldOpen
                ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                : isHoldingOpen
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.5)] cursor-pointer'
                : isFinalDoor
                ? 'bg-stone-900 hover:bg-stone-800 border-amber-400 text-amber-100 cursor-pointer ring-2 ring-amber-400/70'
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
              {isFinalDoor
                ? `★長押し：最終扉を手動開放 (${Math.floor(openHoldProgress)}%)`
                : '長押し：隙間拡大 / 乗車認可'}
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
            {/* 覗き込み変化ライン目盛り（通常検問時のみ） */}
            {!isFinalDoor && (
              <div
                title="身元照合ライン"
                className="absolute top-0 bottom-0 w-0.5 bg-amber-300/80 z-10"
                style={{ left: '60.2%' }}
              />
            )}
          </div>
        </div>

        {/* ＞＜ 閉扉 ボタン */}
        <motion.button
          id="btn-door-close"
          type="button"
          disabled={!isJudging}
          onClick={onPressClose}
          animate={
            isUrgentClose
              ? {
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    '0 0 18px rgba(239,68,68,0.85)',
                    '0 0 38px rgba(239,68,68,1)',
                    '0 0 18px rgba(239,68,68,0.85)',
                  ],
                }
              : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }
          }
          transition={
            isUrgentClose
              ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          whileTap={isJudging ? { scale: 0.94 } : undefined}
          className={`relative w-full py-3.5 px-2.5 rounded border flex flex-col items-center justify-center gap-1 transition-colors whitespace-nowrap overflow-hidden ${
            !isJudging
              ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
              : isUrgentClose
              ? 'bg-red-900 hover:bg-red-800 border-red-400 text-white cursor-pointer ring-2 ring-red-400/90'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200 cursor-pointer'
          }`}
        >
          {isUrgentClose && (
            <span className="absolute inset-0 bg-red-500/25 animate-ping pointer-events-none" />
          )}
          <span className="relative z-10 text-sm sm:text-base font-mincho font-black tracking-widest whitespace-nowrap">
            ＞＜ 閉扉
          </span>
          <span
            className={`relative z-10 text-[11px] whitespace-nowrap font-bold ${
              isUrgentClose
                ? 'text-amber-200'
                : 'text-stone-300 font-normal'
            }`}
          >
            {isJudging && requiredCloseClicks > 1
              ? `★抉開抵抗！残${closeClicksRemaining}回連打`
              : isJudging && floor === 2
              ? '★管理室命令：直ちに遮断しろ'
              : '押下：強制閉扉 / 遮断排除'}
          </span>
        </motion.button>
      </div>

      {/* 下部：小さく2列で「急速換気」と「非常ベル」 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 shrink-0">
        <motion.button
          id="btn-cabin-fan"
          type="button"
          onClick={onToggleFan}
          animate={
            needFanAction && !isFanOn
              ? {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 16px rgba(168,85,247,0.85)',
                    '0 0 34px rgba(216,180,254,1)',
                    '0 0 16px rgba(168,85,247,0.85)',
                  ],
                }
              : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }
          }
          transition={
            needFanAction && !isFanOn
              ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          className={`relative py-2 px-1.5 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap overflow-hidden ${
            needFanAction && !isFanOn
              ? 'bg-purple-900 border-purple-300 text-white ring-2 ring-purple-300/90'
              : isFanOn
              ? 'bg-stone-800 border-emerald-500 text-emerald-200'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
          }`}
        >
          {needFanAction && !isFanOn && (
            <span className="absolute inset-0 bg-purple-400/25 animate-ping pointer-events-none" />
          )}
          <div className="relative z-10 flex items-center gap-1">
            <Fan
              className={`w-3.5 h-3.5 shrink-0 ${
                isFanOn
                  ? 'text-emerald-300 animate-spin'
                  : needFanAction
                  ? 'text-amber-300 animate-spin'
                  : 'text-stone-400'
              }`}
              style={{ animationDuration: isFanOn ? '0.35s' : needFanAction ? '0.55s' : '1.4s' }}
            />
            <span className="text-xs font-bold">急速換気</span>
          </div>
          <span
            className={`relative z-10 text-[10px] font-mono ${
              needFanAction && !isFanOn
                ? 'text-amber-200 font-bold'
                : isFanOn
                ? 'text-emerald-300'
                : 'text-stone-400'
            }`}
          >
            {isFanOn
              ? '強制排気稼働中'
              : needFanAction
              ? '★急速排気起動'
              : '車内強制排気'}
          </span>
        </motion.button>

        <motion.button
          id="btn-emergency-bell"
          type="button"
          onClick={onPressBell}
          animate={
            needBellAction
              ? {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 18px rgba(239,68,68,0.9)',
                    '0 0 38px rgba(248,113,113,1)',
                    '0 0 18px rgba(239,68,68,0.9)',
                  ],
                }
              : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }
          }
          transition={
            needBellAction
              ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          className={`relative py-2 px-1.5 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap overflow-hidden ${
            needBellAction
              ? 'bg-red-800 border-red-300 text-white ring-2 ring-red-300/90'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 active:scale-95 text-stone-300'
          }`}
        >
          {needBellAction && (
            <span className="absolute inset-0 bg-red-400/30 animate-ping pointer-events-none" />
          )}
          <div className="relative z-10 flex items-center gap-1">
            <BellRing
              className={`w-3.5 h-3.5 shrink-0 ${
                needBellAction ? 'text-amber-200 animate-bounce' : 'text-stone-400'
              }`}
            />
            <span className="text-xs font-bold">非常ベル</span>
          </div>
          <span
            className={`relative z-10 text-[10px] font-mono ${
              needBellAction ? 'text-amber-200 font-bold' : 'text-stone-400'
            }`}
          >
            {needBellAction ? '★防衛レーザー照射' : '防衛レーザー照射'}
          </span>
        </motion.button>
      </div>
    </aside>
  );
};
