import React from 'react';
import { motion } from 'framer-motion';
import { Fan, BellRing, Play } from 'lucide-react';
import type { ActivePassenger, GameState, MovingCabinEvent } from '../types/game';

interface ControlPanelProps {
  gameState: GameState;
  unreadNoticeCount: number;
  doorOpenPercent: number;
  isHoldingOpen: boolean;
  isKeyWomanAlertActive: boolean;
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
  variant?: 'desktop' | 'mobile';
}

export const ControlPanel: React.FC<ControlPanelProps> = React.memo(({
  gameState,
  unreadNoticeCount,
  doorOpenPercent,
  isHoldingOpen,
  isKeyWomanAlertActive,
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
  variant = 'desktop',
}) => {
  const isPrepare = gameState === 'PREPARE';
  const hasUnreadNotices = isPrepare && unreadNoticeCount > 0;
  const canStartInspection = isPrepare && unreadNoticeCount === 0;
  const isJudging = gameState === 'JUDGING';
  const isFinalDoor = gameState === 'FINAL_DOOR';
  const isMoving = gameState === 'MOVING';
  const canHoldOpen = isJudging || isFinalDoor;
  const isUrgentClose =
    (isJudging && requiredCloseClicks > 1 && closeClicksRemaining > 0) ||
    isKeyWomanAlertActive;

  const topActionLabel = isPrepare
    ? hasUnreadNotices
      ? '未読通達を確認しろ'
      : '▼ 検問開始（応答）'
    : isMoving || gameState === 'EVENT_RESULT'
    ? '▼ 次階へ降下中'
    : isFinalDoor
    ? '― 最終階層到達 ―'
    : '― 検問実施中 ―';

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

  const closeSubLabel =
    isJudging && requiredCloseClicks > 1
      ? `★連打抵抗 残${closeClicksRemaining}回`
      : isKeyWomanAlertActive
      ? '★命令：直ちに遮断しろ'
      : '押下：強制閉扉 / 遮断';

  if (variant === 'mobile') {
    return (
      <div className="w-full h-full flex flex-col justify-between gap-1 select-none min-w-0">
        {/* 1段目：通達確認中 / 検問開始（応答） / 降下中 */}
        <motion.button
          id="mobile-btn-start-descent"
          type="button"
          disabled={!canStartInspection}
          onClick={onStartDescent}
          whileTap={canStartInspection ? { scale: 0.97 } : undefined}
          className={`w-full py-1.5 px-2 rounded border-2 flex items-center justify-center gap-1 font-black text-xs tracking-wider transition-colors whitespace-nowrap ${
            canStartInspection
              ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-stone-950 shadow-[0_0_16px_rgba(245,158,11,0.65)] animate-pulse cursor-pointer'
              : hasUnreadNotices
              ? 'bg-stone-900/90 border-red-800/80 text-amber-300/90 cursor-not-allowed'
              : 'bg-stone-900/50 border-stone-800 text-stone-600 cursor-not-allowed'
          }`}
        >
          {canStartInspection && (
            <Play className="w-3.5 h-3.5 fill-current rotate-90 shrink-0" />
          )}
          <span>{topActionLabel}</span>
        </motion.button>

        {/* 2段目：大きく押しやすい「開扉（長押し）」＆「閉扉」 */}
        <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
          <div className="flex flex-col gap-1 min-w-0">
            <motion.button
              id="mobile-btn-door-open"
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
              style={{ willChange: 'transform' }}
              animate={
                isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={
                isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                  ? { duration: 0.75, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.15 }
              }
              className={`relative flex-1 py-1.5 px-1.5 rounded border-2 flex flex-col items-center justify-center gap-0.5 transition-colors overflow-hidden touch-hold-btn select-none ${
                !canHoldOpen
                  ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                  : isHoldingOpen
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer'
                  : isFinalDoor
                  ? 'bg-stone-900 border-amber-400 text-amber-100 cursor-pointer ring-2 ring-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.75)]'
                  : 'bg-stone-900 border-stone-600 text-stone-100 cursor-pointer'
              }`}
            >
              <div
                className="absolute inset-0 bg-emerald-500/30 origin-left will-change-transform transition-transform duration-75 pointer-events-none"
                style={{ transform: `scaleX(${openHoldProgress / 100})` }}
              />
              <span className="relative z-10 text-xs sm:text-sm font-mincho font-black tracking-wider">
                ＜＞ 開扉
              </span>
              <span className="relative z-10 text-[9px] text-stone-300 leading-tight text-center">
                {isFinalDoor
                  ? `長押し (${Math.floor(openHoldProgress)}%)`
                  : '長押しで開く'}
              </span>
            </motion.button>
            {/* プログレスバー */}
            <div className="relative w-full bg-stone-950 border border-stone-800 h-2 rounded-xs overflow-hidden p-0.5 shrink-0">
              <div
                className="h-full w-full origin-left will-change-transform bg-gradient-to-r from-amber-500 to-emerald-400 transition-transform duration-75"
                style={{ transform: `scaleX(${openHoldProgress / 100})` }}
              />
              {!isFinalDoor && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300/80 z-10"
                  style={{ left: '60.2%' }}
                />
              )}
            </div>
          </div>

          <motion.button
            id="mobile-btn-door-close"
            type="button"
            disabled={!isJudging}
            onClick={onPressClose}
            style={{ willChange: 'transform' }}
            animate={
              isUrgentClose
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
            }
            transition={
              isUrgentClose
                ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            whileTap={isJudging ? { scale: 0.94 } : undefined}
            className={`relative h-full py-1.5 px-1.5 rounded border-2 flex flex-col items-center justify-center gap-0.5 transition-colors overflow-hidden ${
              !isJudging
                ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                : isUrgentClose
                ? 'bg-red-900 border-red-400 text-white cursor-pointer ring-2 ring-red-400/90 shadow-[0_0_22px_rgba(239,68,68,0.9)]'
                : 'bg-stone-900 border-stone-700 text-stone-200 cursor-pointer'
            }`}
          >
            {isUrgentClose && (
              <span className="absolute inset-0 bg-red-500/25 animate-ping pointer-events-none" />
            )}
            <span className="relative z-10 text-xs sm:text-sm font-mincho font-black tracking-wider">
              ＞＜ 閉扉
            </span>
            <span
              className={`relative z-10 text-[9px] leading-tight text-center font-bold ${
                isUrgentClose ? 'text-amber-200' : 'text-stone-400 font-normal'
              }`}
            >
              {closeSubLabel}
            </span>
          </motion.button>
        </div>

        {/* 3段目：急速換気 & 非常ベル */}
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          <motion.button
            id="mobile-btn-cabin-fan"
            type="button"
            onClick={onToggleFan}
            style={{ willChange: 'transform' }}
            animate={
              needFanAction && !isFanOn
                ? { scale: [1, 1.04, 1] }
                : { scale: 1 }
            }
            transition={
              needFanAction && !isFanOn
                ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            className={`relative py-1.5 px-1.5 rounded border flex items-center justify-center gap-1 transition-colors cursor-pointer overflow-hidden ${
              needFanAction && !isFanOn
                ? 'bg-purple-900 border-purple-300 text-white ring-2 ring-purple-300/90 shadow-[0_0_22px_rgba(168,85,247,0.9)]'
                : isFanOn
                ? 'bg-stone-800 border-emerald-500 text-emerald-200'
                : 'bg-stone-900 border-stone-700 text-stone-300'
            }`}
          >
            {needFanAction && !isFanOn && (
              <span className="absolute inset-0 bg-purple-400/25 animate-ping pointer-events-none" />
            )}
            <Fan
              className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                isFanOn
                  ? 'text-emerald-300 animate-spin'
                  : needFanAction
                  ? 'text-amber-300 animate-spin'
                  : 'text-stone-400'
              }`}
            />
            <span className="relative z-10 text-[11px] font-bold">
              {isFanOn ? '排気中' : '急速換気'}
            </span>
          </motion.button>

          <motion.button
            id="mobile-btn-emergency-bell"
            type="button"
            onClick={onPressBell}
            style={{ willChange: 'transform' }}
            animate={
              needBellAction
                ? { scale: [1, 1.04, 1] }
                : { scale: 1 }
            }
            transition={
              needBellAction
                ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            className={`relative py-1.5 px-1.5 rounded border flex items-center justify-center gap-1 transition-colors cursor-pointer overflow-hidden ${
              needBellAction
                ? 'bg-red-800 border-red-300 text-white ring-2 ring-red-300/90 shadow-[0_0_24px_rgba(239,68,68,0.95)]'
                : 'bg-stone-900 border-stone-700 active:scale-95 text-stone-300'
            }`}
          >
            {needBellAction && (
              <span className="absolute inset-0 bg-red-400/30 animate-ping pointer-events-none" />
            )}
            <BellRing
              className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                needBellAction ? 'text-amber-200 animate-bounce' : 'text-stone-400'
              }`}
            />
            <span className="relative z-10 text-[11px] font-bold">非常ベル</span>
          </motion.button>
        </div>
      </div>
    );
  }

  /* ============================================================
     デスクトップ・PC横画面用操作盤（右パネル・見切れ防止調整済み）
     ============================================================ */
  return (
    <aside className="w-full h-full flex flex-col justify-between p-2.5 metal-panel-surface border-l border-stone-800/90 relative z-20 select-none overflow-hidden">
      {/* 上部：PREPARE（通達確認完了後）に強調表示される「▼ 検問開始（応答）」ボタン */}
      <div className="shrink-0">
        <motion.button
          id="btn-start-descent"
          type="button"
          disabled={!canStartInspection}
          onClick={onStartDescent}
          whileTap={canStartInspection ? { scale: 0.97 } : undefined}
          className={`w-full py-2.5 lg:py-3 px-2 rounded border-2 flex items-center justify-center gap-1.5 font-black text-xs lg:text-sm tracking-wider transition-colors whitespace-nowrap ${
            canStartInspection
              ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.65)] animate-pulse cursor-pointer'
              : hasUnreadNotices
              ? 'bg-stone-900/90 border-red-800/80 text-amber-300/90 cursor-not-allowed'
              : 'bg-stone-900/50 border-stone-800 text-stone-600 cursor-not-allowed'
          }`}
        >
          {canStartInspection && (
            <Play className="w-4 h-4 fill-current rotate-90 shrink-0" />
          )}
          <span>{topActionLabel}</span>
        </motion.button>
      </div>

      {/* 中央：開 (OPEN) ＆ 閉 (CLOSE) ボタン */}
      <div className="flex-1 flex flex-col justify-center gap-2.5 lg:gap-3 my-1.5 min-h-0">
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
            style={{ willChange: 'transform' }}
            animate={
              isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
            }
            transition={
              isFinalDoor && !isHoldingOpen && doorOpenPercent < 100
                ? { duration: 0.75, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            whileTap={canHoldOpen ? { scale: 0.97 } : undefined}
            className={`relative w-full py-2.5 lg:py-3.5 px-2 rounded border-2 flex flex-col items-center justify-center gap-0.5 transition-colors overflow-hidden touch-hold-btn select-none ${
              !canHoldOpen
                ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
                : isHoldingOpen
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.5)] cursor-pointer'
                : isFinalDoor
                ? 'bg-stone-900 hover:bg-stone-800 border-amber-400 text-amber-100 cursor-pointer ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.75)]'
                : 'bg-stone-900 hover:bg-stone-800 border-stone-600 text-stone-100 shadow-md cursor-pointer'
            }`}
          >
            {/* 長押し充填プログレス背景 */}
            <div
              className="absolute inset-0 bg-emerald-500/30 origin-left will-change-transform transition-transform duration-75 pointer-events-none"
              style={{ transform: `scaleX(${openHoldProgress / 100})` }}
            />

            <span className="relative z-10 text-sm lg:text-base font-mincho font-black tracking-widest whitespace-nowrap">
              ＜＞ 開扉
            </span>
            <span className="relative z-10 text-[10px] xl:text-[11px] leading-tight text-center text-stone-300">
              {isFinalDoor
                ? `★長押し：最終扉を手動開放 (${Math.floor(openHoldProgress)}%)`
                : '長押し：隙間拡大 / 乗車認可'}
            </span>
          </motion.button>

          {/* 長押しゲージバー（深覗きポイント目盛り付き） */}
          <div className="relative w-full bg-stone-950 border border-stone-800 h-2.5 rounded-xs overflow-hidden p-0.5">
            <div
              className={`h-full w-full origin-left will-change-transform transition-transform duration-75 ${
                doorOpenPercent >= 65
                  ? 'bg-gradient-to-r from-amber-400 to-emerald-300'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ transform: `scaleX(${openHoldProgress / 100})` }}
            />
            {!isFinalDoor && (
              <div
                title="身元照合ライン"
                className="absolute top-0 bottom-0 w-0.5 bg-amber-300/80 z-10"
                style={{ left: '60.2%' }}
              />
            )}
          </div>
        </div>

        {/* ＞＜ 閉扉 ボタン（下部サブテキストが見切れないようパディングと文字サイズを最適化） */}
        <motion.button
          id="btn-door-close"
          type="button"
          disabled={!isJudging}
          onClick={onPressClose}
          style={{ willChange: 'transform' }}
          animate={
            isUrgentClose
              ? { scale: [1, 1.03, 1] }
              : { scale: 1 }
          }
          transition={
            isUrgentClose
              ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          whileTap={isJudging ? { scale: 0.94 } : undefined}
          className={`relative w-full py-2.5 lg:py-3.5 px-2 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors overflow-hidden ${
            !isJudging
              ? 'bg-stone-900/60 border-stone-800 text-stone-600 cursor-not-allowed'
              : isUrgentClose
              ? 'bg-red-900 hover:bg-red-800 border-red-400 text-white cursor-pointer ring-2 ring-red-400/90 shadow-[0_0_26px_rgba(239,68,68,0.95)]'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200 cursor-pointer'
          }`}
        >
          {isUrgentClose && (
            <span className="absolute inset-0 bg-red-500/25 animate-ping pointer-events-none" />
          )}
          <span className="relative z-10 text-sm lg:text-base font-mincho font-black tracking-widest whitespace-nowrap">
            ＞＜ 閉扉
          </span>
          <span
            className={`relative z-10 text-[10px] xl:text-[11px] leading-tight text-center font-bold ${
              isUrgentClose
                ? 'text-amber-200'
                : 'text-stone-300 font-normal'
            }`}
          >
            {isJudging && requiredCloseClicks > 1
              ? `★抉開抵抗！残${closeClicksRemaining}回連打`
              : isKeyWomanAlertActive
              ? '★管理室命令：直ちに遮断しろ'
              : '押下：強制閉扉 / 遮断排除'}
          </span>
        </motion.button>
      </div>

      {/* 下部：小さく2列で「急速換気」と「非常ベル」 */}
      <div className="grid grid-cols-2 gap-1.5 lg:gap-2 pt-2 border-t border-stone-800 shrink-0">
        <motion.button
          id="btn-cabin-fan"
          type="button"
          onClick={onToggleFan}
          style={{ willChange: 'transform' }}
          animate={
            needFanAction && !isFanOn
              ? { scale: [1, 1.05, 1] }
              : { scale: 1 }
          }
          transition={
            needFanAction && !isFanOn
              ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          className={`relative py-2 px-1 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer overflow-hidden ${
            needFanAction && !isFanOn
              ? 'bg-purple-900 border-purple-300 text-white ring-2 ring-purple-300/90 shadow-[0_0_24px_rgba(168,85,247,0.9)]'
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
            <span className="text-xs font-bold whitespace-nowrap">急速換気</span>
          </div>
          <span
            className={`relative z-10 text-[9px] xl:text-[10px] font-mono leading-tight text-center ${
              needFanAction && !isFanOn
                ? 'text-amber-200 font-bold'
                : isFanOn
                ? 'text-emerald-300'
                : 'text-stone-400'
            }`}
          >
            {isFanOn
              ? '強制排気中'
              : needFanAction
              ? '★急速排気起動'
              : '車内強制排気'}
          </span>
        </motion.button>

        <motion.button
          id="btn-emergency-bell"
          type="button"
          onClick={onPressBell}
          style={{ willChange: 'transform' }}
          animate={
            needBellAction
              ? { scale: [1, 1.05, 1] }
              : { scale: 1 }
          }
          transition={
            needBellAction
              ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          className={`relative py-2 px-1 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer overflow-hidden ${
            needBellAction
              ? 'bg-red-800 border-red-300 text-white ring-2 ring-red-300/90 shadow-[0_0_26px_rgba(239,68,68,0.95)]'
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
            <span className="text-xs font-bold whitespace-nowrap">非常ベル</span>
          </div>
          <span
            className={`relative z-10 text-[9px] xl:text-[10px] font-mono leading-tight text-center ${
              needBellAction ? 'text-amber-200 font-bold' : 'text-stone-400'
            }`}
          >
            {needBellAction ? '★レーザー照射' : '防衛レーザー'}
          </span>
        </motion.button>
      </div>
    </aside>
  );
});
