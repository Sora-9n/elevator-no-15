import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, NoticeRule } from '../types/game';
import { ClipboardList, BookOpen, X, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/SoundManager';

interface NoticeBoardProps {
  rules: NoticeRule[];
  currentFloor: number;
  gameState: GameState;
  judgingTimeLeftMs: number;
  readRuleIds: string[];
  onMarkRuleRead: (id: string) => void;
  onModalOpenChange: (isOpen: boolean) => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({
  rules,
  currentFloor,
  gameState,
  judgingTimeLeftMs,
  readRuleIds,
  onMarkRuleRead,
  onModalOpenChange,
}) => {
  const [selectedRule, setSelectedRule] = useState<NoticeRule | null>(null);
  const [showManual, setShowManual] = useState(false);

  // 現在の階層までに貼り出された張り紙のみ表示（15F:3枚 → 10F:5枚 → 5F:7枚）
  const unlockedRules = rules.filter((r) => currentFloor <= r.unlockedAtFloor);

  const handleOpenRule = (rule: NoticeRule) => {
    soundManager.playButtonClick('PAPER');
    onMarkRuleRead(rule.id);
    setSelectedRule(rule);
    setShowManual(false);
    onModalOpenChange(true);
  };

  const handleOpenManual = () => {
    soundManager.playButtonClick('PAPER');
    setSelectedRule(null);
    setShowManual(true);
    onModalOpenChange(true);
  };

  const handleCloseModal = () => {
    soundManager.playButtonClick('PAPER');
    setSelectedRule(null);
    setShowManual(false);
    onModalOpenChange(false);
  };

  return (
    <>
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

          {/* 張り紙の短いタイトルボタン一覧 */}
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5 min-h-0">
            {unlockedRules.map((rule) => {
              const isNew = !readRuleIds.includes(rule.id);
              const isCorrupted = Boolean(rule.isCorrupted);

              return (
                <button
                  key={rule.id}
                  id={`notice-card-${rule.id}`}
                  type="button"
                  onClick={() => handleOpenRule(rule)}
                  className={`w-full text-left px-2.5 py-2 rounded-xs border transition-all flex items-center justify-between gap-1.5 cursor-pointer shrink-0 ${
                    isCorrupted
                      ? 'bg-red-950/90 border-red-700 text-red-200 hover:bg-red-900/90 shadow-[0_2px_10px_rgba(153,27,27,0.5)]'
                      : 'aged-paper border-stone-600 text-stone-900 hover:brightness-105 shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isNew && (
                      <span className="shrink-0 bg-red-800 border border-red-400/60 text-stone-100 text-[9px] font-mincho font-black px-1.5 py-0.5 tracking-widest animate-pulse whitespace-nowrap">
                        未読
                      </span>
                    )}
                    <span
                      className={`text-xs font-bold truncate ${
                        isCorrupted ? 'font-mincho text-red-200' : 'font-mincho text-stone-900'
                      }`}
                    >
                      {rule.shortTitle}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCorrupted ? 'text-red-400' : 'text-stone-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* 下部：運行手引書ボタン */}
        <div className="pt-2 border-t border-stone-800 shrink-0">
          <button
            id="open-manual-btn"
            type="button"
            onClick={handleOpenManual}
            className="w-full py-2 px-3 rounded-xs bg-stone-900/95 hover:bg-stone-800 border border-amber-700/60 text-stone-200 text-xs font-mincho font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-inner"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>運行手引書（業務規程）</span>
          </button>
        </div>
      </aside>

      {/* 張り紙詳細 ／ 運行手引書 拡大モーダル */}
      <AnimatePresence>
        {(selectedRule || showManual) && (
          <motion.div
            id="notice-zoom-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4"
          >
            {/* 検問中（JUDGING）に開いている場合は背後の迫る猶予警告を世界観に合った警告板で表示 */}
            {gameState === 'JUDGING' && (
              <div className="mb-3 bg-stone-950/95 border-2 border-red-700 text-red-100 px-4 py-1.5 rounded-xs text-xs font-mincho font-bold flex items-center gap-3 shadow-[0_0_24px_rgba(185,28,28,0.85)] animate-pulse whitespace-nowrap">
                <span className="tracking-wider">
                  【警戒】検閲中ニ付、文書照合中モ扉ノ外ニ対象ガ待機シテイル
                </span>
                <span className="border-l border-red-800 pl-3 font-seven-seg text-sm text-amber-400">
                  猶予 {(judgingTimeLeftMs / 1000).toFixed(1)} 秒
                </span>
              </div>
            )}

            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-lg w-full rounded-xs p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] border-2 relative ${
                selectedRule?.isCorrupted
                  ? 'bg-stone-950 border-red-700 text-red-100'
                  : 'aged-paper border-stone-700 text-stone-900'
              }`}
            >
              <button
                id="close-notice-modal-btn"
                type="button"
                onClick={handleCloseModal}
                className={`absolute top-3 right-3 p-1.5 rounded-xs transition-colors cursor-pointer ${
                  selectedRule?.isCorrupted
                    ? 'bg-red-900/40 hover:bg-red-800/60 text-red-200'
                    : 'bg-stone-900/15 hover:bg-stone-900/30 text-stone-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              {selectedRule ? (
                <div>
                  <div
                    className={`flex items-center justify-between border-b-2 pb-3 mb-4 pr-8 ${
                      selectedRule.isCorrupted ? 'border-red-800' : 'border-stone-800'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-mincho font-bold block ${
                          selectedRule.isCorrupted ? 'text-red-400' : 'text-stone-700'
                        }`}
                      >
                        {selectedRule.subtitle}
                      </span>
                      <h3
                        className={`font-mincho text-lg md:text-xl font-extrabold mt-0.5 ${
                          selectedRule.isCorrupted ? 'text-red-200' : 'text-stone-950'
                        }`}
                      >
                        {selectedRule.title}
                      </h3>
                    </div>
                    {selectedRule.stampText && (
                      <div
                        className={`border-2 font-mincho font-extrabold text-xs px-2 py-1 rotate-[-5deg] shrink-0 whitespace-nowrap ${
                          selectedRule.isCorrupted
                            ? 'border-red-500 text-red-400'
                            : 'border-red-800 text-red-800'
                        }`}
                      >
                        {selectedRule.stampText}
                      </div>
                    )}
                  </div>

                  <p
                    className={`font-mincho text-sm leading-relaxed mb-4 whitespace-pre-line ${
                      selectedRule.isCorrupted ? 'text-red-200 font-bold' : 'text-stone-900'
                    }`}
                  >
                    {selectedRule.content}
                  </p>

                  <div
                    className={`border-2 p-3 rounded-xs mb-4 font-mincho ${
                      selectedRule.isCorrupted
                        ? 'bg-red-950/80 border-red-600 text-red-100'
                        : 'bg-red-900/15 border-red-800/80 text-red-950'
                    }`}
                  >
                    <div className="text-[11px] font-bold opacity-80 mb-0.5">
                      【検問の要旨】
                    </div>
                    <div className="text-sm font-extrabold">
                      {selectedRule.highlightWarning}
                    </div>
                  </div>

                  {/* モーダル内で前後の張り紙を素早く切り替えるボタン */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-600/50 font-mincho">
                    <div className="flex flex-wrap gap-1">
                      {unlockedRules.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleOpenRule(r)}
                          className={`px-2 py-1 rounded-xs text-xs font-bold cursor-pointer border ${
                            r.id === selectedRule.id
                              ? 'bg-stone-900 border-stone-900 text-amber-400'
                              : 'bg-stone-800/15 border-stone-600/50 hover:bg-stone-800/30 text-stone-800'
                          }`}
                        >
                          通達{i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-1.5 rounded-xs bg-stone-900 text-stone-100 text-xs font-bold tracking-wider hover:bg-stone-800 cursor-pointer"
                    >
                      査読終了
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-stone-900 font-mincho">
                  {/* 手引書ヘッダー（公文書・朱印風デザイン） */}
                  <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-3.5 pr-8">
                    <div>
                      <span className="text-[11px] font-bold text-stone-700 tracking-wider block">
                        管理組合 保安課 編纂 — 乗務員必携（機密第15號）
                      </span>
                      <h3 className="text-lg md:text-xl font-extrabold text-stone-950 tracking-wide mt-0.5">
                        第十五號昇降機 運行手引書
                      </h3>
                    </div>
                    <div className="border-2 border-red-800 text-red-800 font-extrabold text-xs px-2 py-1 rotate-[-4deg] shrink-0 whitespace-nowrap">
                      取扱注意
                    </div>
                  </div>

                  {/* 罫線枠の条文テーブル */}
                  <div className="border-2 border-stone-800 divide-y divide-stone-700/80 bg-stone-900/5 text-xs leading-relaxed">
                    <div className="p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>壱、扉ノ開閉ト覗キ込ミ検閲</span>
                        <span className="text-[10px] font-bold text-red-900 border border-red-800/60 px-1.5 py-0.2">
                          基本業務
                        </span>
                      </div>
                      <p className="text-stone-800">
                        到着時、扉ハ僅カナ隙間ノミ開ク。「開」ヲ長押シシテ隙間ヲ広ゲ、胸元ノ名札ヤ荷物ヲ確認セヨ。扉ヲ大キク開ケタ際ニ本性ヲ現ス異形モ存在スル。異常ヲ認メタラ直チニ指ヲ離シ、「閉」ニテ遮断セヨ。（扉ニ手ヲ掛ケ抵抗スル個体ニハ「閉」ヲ連打セヨ）
                      </p>
                    </div>

                    <div className="p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>弐、急速換気装置ノ運用</span>
                        <span className="text-[10px] font-bold text-stone-800 border border-stone-700 px-1.5 py-0.2">
                          車内設備
                        </span>
                      </div>
                      <p className="text-stone-800">
                        降下中、床下ヨリ有毒ナ瘴気ガ湧キ出タ際、マタハ同乗者ヨリ換気ノ要望ガアッタ際ハ、直チニ「急速換気」ヲ起動セヨ。※異常ガナイ平時ニ稼働サセルト、同乗者カラノ苦情通報トナルタメ厳禁。
                      </p>
                    </div>

                    <div className="p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>参、非常ベルニヨル緊急排除</span>
                        <span className="text-[10px] font-bold text-red-900 border border-red-800/60 px-1.5 py-0.2">
                          低層警戒
                        </span>
                      </div>
                      <p className="text-stone-800">
                        低層階（伍階以下）ノ降下中、正面扉ノ鏡面ニ「背後ニ立ツ異形」ガ映リ込ム事案ガ報告サレテイル。確認次第、直チニ「非常ベル」ヲ鳴ラシ、緊急制動ニテ車外ヘ排除セヨ。
                      </p>
                    </div>

                    <div className="p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>肆、規程ノ改定ト文書照合</span>
                        <span className="text-[10px] font-bold text-stone-800 border border-stone-700 px-1.5 py-0.2">
                          注意事項
                        </span>
                      </div>
                      <p className="text-stone-800">
                        拾階・伍階ニテ追加サレル通達ハ、従前ノ規則ヲ上書キスル。検閲中ニ文書ヲ開イテイル間モ、外ノ訪問者ハ僅カズツ扉ニ迫ッテイル。速ヤカニ照合ヲ終エヨ。
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-stone-700 font-bold">
                      ※手引書ノ紛失・汚損ハ懲戒対象トス
                    </span>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-1.5 rounded-xs bg-stone-900 text-stone-100 text-xs font-bold tracking-wider hover:bg-stone-800 cursor-pointer"
                    >
                      手引書ヲ閉ジル
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

