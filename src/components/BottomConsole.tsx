import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ActivePassenger,
  EventOutcome,
  GameState,
  MovingCabinEvent,
  VisitorData,
} from '../types/game';
import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BottomConsoleProps {
  gameState: GameState;
  currentVisitor: VisitorData | null;
  activeSubtitle: string;
  eventOutcome: EventOutcome | null;
  activePassengers: ActivePassenger[];
  movingEvent: MovingCabinEvent | null;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  gameState,
  activeSubtitle,
  eventOutcome,
  activePassengers,
  movingEvent,
}) => {
  const activeRequester = activePassengers.find(
    (p) => p.pendingRequest && !p.requestFulfilled
  );
  const isDangerMovingEvent =
    gameState === 'MOVING' &&
    movingEvent &&
    movingEvent.status === 'ACTIVE' &&
    (movingEvent.type === 'MIASMA' || movingEvent.type === 'MIRROR_GHOST');

  return (
    <footer className="relative z-30 w-full px-4 py-2.5 mobile-landscape-bottom bg-stone-950/95 border-t border-stone-800 flex flex-col justify-between gap-2 shrink-0 min-h-[112px] max-h-[126px]">
      {/* 上段：訪問者のセリフ字幕（名前や属性のネタバレ表記を完全撤廃） */}
      <div className="flex-1 flex flex-col justify-center bg-black/75 border border-stone-800/90 rounded px-3.5 py-2 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-1 whitespace-nowrap">
          <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDangerMovingEvent
                  ? 'bg-red-500 animate-ping'
                  : gameState === 'JUDGING'
                  ? 'bg-amber-400 animate-ping'
                  : activeRequester && gameState === 'MOVING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-stone-600'
              }`}
            />
            {gameState === 'JUDGING'
              ? '廊下からの声'
              : gameState === 'EVENT_RESULT' && eventOutcome
              ? eventOutcome.title
              : isDangerMovingEvent
              ? movingEvent?.type === 'MIASMA'
                ? '車内異常（有毒瘴気）'
                : '背後の気配（鏡面反射）'
              : activeRequester && gameState === 'MOVING'
              ? '車内からの要求'
              : '車内モニター'}
          </span>

          {gameState === 'EVENT_RESULT' && eventOutcome && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                eventOutcome.type.startsWith('SAFE')
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
                  : 'bg-red-950 text-red-300 border border-red-600/60'
              }`}
            >
              {eventOutcome.detail}
            </span>
          )}

          {gameState === 'MOVING' && movingEvent && movingEvent.status === 'ACTIVE' && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-200 border border-red-500/80 whitespace-nowrap font-seven-seg">
              対処猶予 {(movingEvent.timeLeftMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubtitle}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18 }}
            id="subtitle-box"
            className={`font-mincho text-base md:text-lg font-bold leading-snug truncate ${
              isDangerMovingEvent ||
              (gameState === 'EVENT_RESULT' &&
                eventOutcome?.type === 'MISTAKE_BOARDED_THREAT')
                ? 'text-red-400'
                : activeRequester && gameState === 'MOVING'
                ? 'text-amber-300'
                : 'text-stone-100'
            }`}
          >
            {activeSubtitle}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 下段：車内収容者ステータス一覧（最大1〜2名・自動降車までの残り階層表示） */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs whitespace-nowrap overflow-hidden">
        <div className="flex items-center gap-1.5 text-stone-400 shrink-0 whitespace-nowrap">
          <Users className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold">車内収容対象 ({activePassengers.length}名):</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {activePassengers.length === 0 ? (
            <span className="text-xs text-stone-500 whitespace-nowrap">
              同乗者なし（安全）
            </span>
          ) : (
            activePassengers.map((p, idx) => {
              const hasUnfulfilled = p.pendingRequest && !p.requestFulfilled;
              return (
                <div
                  key={`${p.visitor.id}-${p.boardedFloor}-${idx}`}
                  className={`px-2.5 py-0.5 rounded text-xs font-bold flex items-center gap-1.5 shrink-0 border whitespace-nowrap ${
                    hasUnfulfilled
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse'
                      : 'bg-stone-900 border-stone-700 text-stone-200'
                  }`}
                >
                  <span>
                    {p.boardedFloor}F収容対象 (残{p.remainingFloors}階で退出)
                  </span>
                  {p.pendingRequest && (
                    <span className="flex items-center gap-1 text-[11px]">
                      {p.requestFulfilled ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          処置完了
                        </span>
                      ) : (
                        <span className="text-amber-300 flex items-center gap-0.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          要求: {p.pendingRequest.actionLabel}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </footer>
  );
};
