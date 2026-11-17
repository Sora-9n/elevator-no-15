import React, { useMemo } from 'react';
import type { NoticeRule, ScrapMemo } from '../types/game';
import { ClipboardList, BookOpen, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/SoundManager';

interface NoticeBoardProps {
  rules: NoticeRule[];
  scrapMemos: ScrapMemo[];
  currentFloor: number;
  readRuleIds: string[];
  onOpenRule: (rule: NoticeRule) => void;
  onOpenManual: () => void;
  onOpenMemo: (memo: ScrapMemo) => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = React.memo(({
  rules,
  scrapMemos,
  currentFloor,
  readRuleIds,
  onOpenRule,
  onOpenManual,
  onOpenMemo,
}) => {
  // 現在の階層までに発令された公式通達のみ表示（15F:3通 → 10F:5通 → 5F:6通）
  const unlockedRules = useMemo(
    () => rules.filter((r) => currentFloor <= r.unlockedAtFloor),
    [rules, currentFloor]
  );

  // 現在の階層までに発見された前任者の断片メモ（15F:1枚 → 10F:2枚 → 5F:3枚）
  const unlockedMemos = useMemo(
    () => scrapMemos.filter((m) => currentFloor <= m.unlockedAtFloor),
    [scrapMemos, currentFloor]
  );

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

      {/* 下部：前任者の隙間の紙片一覧（15F / 10F / 5F） ＋ 運行手引書ボタン */}
      <div className="pt-2 border-t border-stone-800 shrink-0 flex flex-col gap-1.5">
        {unlockedMemos.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-0.5 text-[10px] font-mincho text-red-300/80 font-bold">
              <span>隙間の紙片（監視外）</span>
              <span>{unlockedMemos.length}枚</span>
            </div>
            {unlockedMemos.map((memo) => {
              const isMemoUnread = !readRuleIds.includes(memo.id);
              return (
                <button
                  key={memo.id}
                  id={`open-scrap-memo-${memo.id}`}
                  type="button"
                  onClick={() => {
                    soundManager.playButtonClick('PAPER');
                    onOpenMemo(memo);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xs bg-red-950/90 hover:bg-red-900/90 border border-red-800/90 text-red-200 text-[11px] font-mincho font-bold tracking-wider flex items-center justify-between gap-1.5 transition-colors cursor-pointer shadow-[0_2px_10px_rgba(127,29,29,0.45)]"
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="shrink-0 text-[10px]">🩸</span>
                    <span className="truncate">{memo.buttonLabel}</span>
                  </span>
                  {isMemoUnread && (
                    <span className="shrink-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 tracking-widest animate-pulse">
                      未読
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
});

interface MobileDocButtonsProps {
  rules: NoticeRule[];
  scrapMemos: ScrapMemo[];
  currentFloor: number;
  readRuleIds: string[];
  onOpenRuleList: () => void;
  onOpenManual: () => void;
  onOpenMemoList: () => void;
}

export const MobileDocButtons: React.FC<MobileDocButtonsProps> = React.memo(({
  rules,
  scrapMemos,
  currentFloor,
  readRuleIds,
  onOpenRuleList,
  onOpenManual,
  onOpenMemoList,
}) => {
  const unlockedRules = useMemo(
    () => rules.filter((r) => currentFloor <= r.unlockedAtFloor),
    [rules, currentFloor]
  );
  const unreadRuleCount = useMemo(
    () => unlockedRules.filter((r) => !readRuleIds.includes(r.id)).length,
    [unlockedRules, readRuleIds]
  );

  const unlockedMemos = useMemo(
    () => scrapMemos.filter((m) => currentFloor <= m.unlockedAtFloor),
    [scrapMemos, currentFloor]
  );
  const unreadMemoCount = useMemo(
    () => unlockedMemos.filter((m) => !readRuleIds.includes(m.id)).length,
    [unlockedMemos, readRuleIds]
  );

  return (
    <div className="flex flex-col justify-between gap-1 h-full min-w-0">
      {/* 📋 保安通達（未読バッジ付） */}
      <button
        id="mobile-btn-notices"
        type="button"
        onClick={() => {
          soundManager.playButtonClick('PAPER');
          onOpenRuleList();
        }}
        className="relative flex-1 min-h-[34px] px-1.5 py-0.5 rounded border border-stone-600 aged-paper text-stone-950 font-mincho font-extrabold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-transform shadow"
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
        className="flex-1 min-h-[30px] px-1.5 py-0.5 rounded border border-amber-700/70 bg-stone-900 hover:bg-stone-800 text-stone-200 font-mincho font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-inner"
      >
        <span>📖 運行手引書</span>
      </button>

      {/* 🩸 隙間の紙片（15F / 10F / 5F で段階的に追加） */}
      {unlockedMemos.length > 0 && (
        <button
          id="mobile-btn-memo"
          type="button"
          onClick={() => {
            soundManager.playButtonClick('PAPER');
            onOpenMemoList();
          }}
          className="relative flex-1 min-h-[32px] px-1.5 py-0.5 rounded border border-red-700 bg-red-950/95 text-red-100 font-mincho font-extrabold text-[11px] flex flex-col items-center justify-center gap-0 cursor-pointer active:scale-95 transition-transform shadow-[0_0_12px_rgba(185,28,28,0.55)]"
        >
          {unreadMemoCount > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-red-600 border border-red-200 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              未読{unreadMemoCount}
            </span>
          )}
          <span className="truncate leading-tight">🩸 隙間の紙片</span>
          <span className="text-[9px] text-red-300/90 font-bold leading-none">
            全{unlockedMemos.length}枚
          </span>
        </button>
      )}
    </div>
  );
});

