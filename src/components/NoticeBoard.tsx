import React from 'react';
import type { CorruptedMemo, NoticeRule } from '../types/game';
import { ClipboardList, BookOpen, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/SoundManager';

interface NoticeBoardProps {
  rules: NoticeRule[];
  corruptedMemo: CorruptedMemo;
  currentFloor: number;
  readRuleIds: string[];
  onOpenRule: (rule: NoticeRule) => void;
  onOpenManual: () => void;
  onOpenMemo: () => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({
  rules,
  corruptedMemo,
  currentFloor,
  readRuleIds,
  onOpenRule,
  onOpenManual,
  onOpenMemo,
}) => {
  // 現在の階層までに発令された公式通達のみ表示（15F:3通 → 10F:5通 → 5F:6通）
  const unlockedRules = rules.filter((r) => currentFloor <= r.unlockedAtFloor);
  const showCorruptedMemo = currentFloor <= corruptedMemo.unlockedAtFloor;
  const isMemoUnread = !readRuleIds.includes(corruptedMemo.id);

  return (
    <aside className="w-full h-full flex flex-col justify-between p-2.5 metal-panel-surface border-r border-stone-800/90 relative z-20 overflow-hidden">
      {/* 上部見出し：保安通達・張り紙 */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between border-b border-stone-700/80 pb-2 mb-2 shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <ClipboardList className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-xs font-mincho font-extrabold tracking-widest text-stone-200 whitespace-nowrap">
              保安通達・張り紙
            </h2>
          </div>
          <span className="text-[11px] font-mincho font-bold text-stone-400 whitespace-nowrap">
            計{unlockedRules.length}通
          </span>
        </div>

        {/* 公式通達のタイトルボタン一覧 */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5 min-h-0">
          {unlockedRules.map((rule) => {
            const isNew = !readRuleIds.includes(rule.id);

            return (
              <button
                key={rule.id}
                id={`notice-card-${rule.id}`}
                type="button"
                onClick={() => {
                  soundManager.playButtonClick('PAPER');
                  onOpenRule(rule);
                }}
                className="w-full text-left px-2.5 py-2 rounded-xs border transition-all flex items-center justify-between gap-1.5 cursor-pointer shrink-0 aged-paper border-stone-600 text-stone-900 hover:brightness-105 shadow-md"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isNew && (
                    <span className="shrink-0 bg-red-800 border border-red-400/60 text-stone-100 text-[9px] font-mincho font-black px-1.5 py-0.5 tracking-widest animate-pulse whitespace-nowrap">
                      未読
                    </span>
                  )}
                  <span className="text-xs font-bold truncate font-mincho text-stone-900">
                    {rule.shortTitle}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-stone-700" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 下部：独立した血塗れの紙片ボタン（5F以降） ＋ 運行手引書ボタン */}
      <div className="pt-2 border-t border-stone-800 shrink-0 flex flex-col gap-1.5">
        {showCorruptedMemo && (
          <button
            id="open-corrupted-memo-btn"
            type="button"
            onClick={() => {
              soundManager.playButtonClick('PAPER');
              onOpenMemo();
            }}
            className="w-full py-2 px-2.5 rounded-xs bg-red-950/90 hover:bg-red-900/90 border border-red-700 text-red-200 text-xs font-mincho font-bold tracking-wider flex items-center justify-between gap-1.5 transition-colors cursor-pointer shadow-[0_2px_12px_rgba(153,27,27,0.5)]"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="shrink-0">🩸</span>
              <span className="truncate">{corruptedMemo.buttonLabel}</span>
            </span>
            {isMemoUnread && (
              <span className="shrink-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 tracking-widest animate-pulse">
                未読
              </span>
            )}
          </button>
        )}

        <button
          id="open-manual-btn"
          type="button"
          onClick={() => {
            soundManager.playButtonClick('PAPER');
            onOpenManual();
          }}
          className="w-full py-2 px-3 rounded-xs bg-stone-900/95 hover:bg-stone-800 border border-amber-700/60 text-stone-200 text-xs font-mincho font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-inner"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>運行手引書（業務規程）</span>
        </button>
      </div>
    </aside>
  );
};

interface MobileDocButtonsProps {
  rules: NoticeRule[];
  corruptedMemo: CorruptedMemo;
  currentFloor: number;
  readRuleIds: string[];
  onOpenRuleList: () => void;
  onOpenManual: () => void;
  onOpenMemo: () => void;
}

export const MobileDocButtons: React.FC<MobileDocButtonsProps> = ({
  rules,
  corruptedMemo,
  currentFloor,
  readRuleIds,
  onOpenRuleList,
  onOpenManual,
  onOpenMemo,
}) => {
  const unlockedRules = rules.filter((r) => currentFloor <= r.unlockedAtFloor);
  const unreadRuleCount = unlockedRules.filter((r) => !readRuleIds.includes(r.id)).length;
  const showCorruptedMemo = currentFloor <= corruptedMemo.unlockedAtFloor;
  const isMemoUnread = !readRuleIds.includes(corruptedMemo.id);

  return (
    <div className="flex flex-col justify-between gap-1.5 h-full min-w-0">
      {/* 📋 保安通達（未読バッジ付） */}
      <button
        id="mobile-btn-notices"
        type="button"
        onClick={() => {
          soundManager.playButtonClick('PAPER');
          onOpenRuleList();
        }}
        className="relative flex-1 min-h-[42px] px-2 py-1.5 rounded border border-stone-600 aged-paper text-stone-950 font-mincho font-extrabold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-transform shadow"
      >
        {unreadRuleCount > 0 && (
          <span className="absolute -top-1.5 -right-1 bg-red-700 border border-red-300 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow">
            未読{unreadRuleCount}
          </span>
        )}
        <span className="leading-tight">📋 保安通達</span>
        <span className="text-[9px] text-stone-700 font-bold leading-none">
          全{unlockedRules.length}通を確認
        </span>
      </button>

      {/* 📖 運行手引書 */}
      <button
        id="mobile-btn-manual"
        type="button"
        onClick={() => {
          soundManager.playButtonClick('PAPER');
          onOpenManual();
        }}
        className="flex-1 min-h-[38px] px-2 py-1.5 rounded border border-amber-700/70 bg-stone-900 hover:bg-stone-800 text-stone-200 font-mincho font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-inner"
      >
        <span>📖 運行手引書</span>
      </button>

      {/* 🩸 隙間の紙片（5F以降に出現） */}
      {showCorruptedMemo && (
        <button
          id="mobile-btn-memo"
          type="button"
          onClick={() => {
            soundManager.playButtonClick('PAPER');
            onOpenMemo();
          }}
          className="relative flex-1 min-h-[38px] px-2 py-1.5 rounded border border-red-600 bg-red-950/95 text-red-100 font-mincho font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-[0_0_12px_rgba(185,28,28,0.65)]"
        >
          {isMemoUnread && (
            <span className="absolute -top-1.5 -right-1 bg-red-600 border border-red-200 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              未読
            </span>
          )}
          <span className="truncate">🩸 隙間の紙片</span>
        </button>
      )}
    </div>
  );
};
