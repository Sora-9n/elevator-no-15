import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, ChevronRight } from 'lucide-react';
import type { CorruptedMemo, GameState, NoticeRule } from '../types/game';
import { soundManager } from '../utils/SoundManager';

export type InspectModalState =
  | null
  | { type: 'RULE_LIST' }
  | { type: 'RULE'; rule: NoticeRule }
  | { type: 'MANUAL' }
  | { type: 'MEMO' };

interface NoticeModalsProps {
  modalState: InspectModalState;
  unlockedRules: NoticeRule[];
  corruptedMemo: CorruptedMemo;
  readRuleIds: string[];
  gameState: GameState;
  judgingTimeLeftMs: number;
  onSelectRule: (rule: NoticeRule) => void;
  onClose: () => void;
}

export const NoticeModals: React.FC<NoticeModalsProps> = ({
  modalState,
  unlockedRules,
  corruptedMemo,
  readRuleIds,
  gameState,
  judgingTimeLeftMs,
  onSelectRule,
  onClose,
}) => {
  const isMemo = modalState?.type === 'MEMO';

  return (
    <AnimatePresence>
      {modalState && (
        <motion.div
          id="notice-zoom-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-[2px] flex flex-col items-center justify-start p-2.5 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y"
        >
          {/* 検問中（JUDGING）に開いている場合は背後の迫る猶予警告を表示 */}
          {gameState === 'JUDGING' && (
            <div className="mb-2 sm:mb-3 bg-stone-950/95 border-2 border-red-700 text-red-100 px-3 py-1.5 rounded-xs text-[11px] sm:text-xs font-mincho font-bold flex items-center gap-2 shadow-[0_0_24px_rgba(185,28,28,0.85)] animate-pulse max-w-lg w-full justify-between shrink-0">
              <span className="tracking-wider truncate">
                【監視室警告】検閲制限時間が迫っている。速やかに照合を完了しろ。
              </span>
              <span className="border-l border-red-800 pl-2 font-seven-seg text-xs sm:text-sm text-amber-400 shrink-0">
                猶予 {(judgingTimeLeftMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}

          {isMemo ? (
            /* ============================================================
               ★ 5F「血に塗れた走り書き」専用ボロボロ血文字メモデザイン（管理室フォーマット完全分離）
               ============================================================ */
            <motion.div
              initial={{ scale: 0.9, rotate: -1.5, y: 14 }}
              animate={{ scale: 1, rotate: -0.6, y: 0 }}
              exit={{ scale: 0.9, y: 14 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full max-h-[86dvh] overflow-y-auto overscroll-contain touch-pan-y bloody-scrap-paper p-5 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.98)] border-2 border-red-950/80 relative my-auto shrink-0"
            >
              <button
                id="close-notice-modal-btn"
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-xs bg-red-950/20 hover:bg-red-950/40 text-red-950 transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b-2 border-red-900/60 pb-2.5 mb-4 pr-8">
                <span className="text-[11px] font-mincho font-bold text-red-900/80 tracking-widest block">
                  ※扉の隙間から滑り込んできた、血に汚れた紙片
                </span>
                <h3 className="font-mincho text-xl sm:text-2xl font-black text-red-950 tracking-wider mt-1">
                  {corruptedMemo.title}
                </h3>
              </div>

              <p className="font-mincho text-sm sm:text-base leading-loose text-stone-950 font-extrabold whitespace-pre-line mb-5 tracking-wide">
                {corruptedMemo.content}
              </p>

              <div className="border-l-4 border-red-800 bg-red-950/10 px-3 py-2 mb-5 font-mincho">
                <p className="text-xs sm:text-sm font-black text-red-950 leading-relaxed">
                  {corruptedMemo.highlightText}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-red-900/40 font-mincho">
                <span className="text-[10px] font-bold text-red-900/80">
                  （監視カメラの死角・管理室通達外）
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xs bg-red-950 hover:bg-red-900 text-red-100 text-xs font-bold tracking-wider cursor-pointer shadow"
                >
                  紙片を隠す
                </button>
              </div>
            </motion.div>
          ) : (
            /* ============================================================
               ★ 公式の保安通達一覧・詳細 ／ 運行手引書モーダル
               ============================================================ */
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full max-h-[86dvh] overflow-y-auto overscroll-contain touch-pan-y rounded-xs p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] border-2 aged-paper border-stone-700 text-stone-900 relative my-auto shrink-0"
            >
              <button
                id="close-notice-modal-btn"
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-xs bg-stone-900/15 hover:bg-stone-900/30 text-stone-900 transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {modalState.type === 'RULE_LIST' ? (
                <div className="font-mincho">
                  <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2.5 mb-3 pr-8">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-red-900 shrink-0" />
                      <h3 className="text-base sm:text-lg font-extrabold text-stone-950">
                        管理室 保安通達一覧（計{unlockedRules.length}通）
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {unlockedRules.map((rule) => {
                      const isNew = !readRuleIds.includes(rule.id);
                      return (
                        <button
                          key={rule.id}
                          type="button"
                          onClick={() => {
                            soundManager.playButtonClick('PAPER');
                            onSelectRule(rule);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xs border border-stone-700 bg-stone-900/5 hover:bg-stone-900/12 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isNew && (
                              <span className="shrink-0 bg-red-800 text-stone-100 text-[9px] font-black px-1.5 py-0.5 tracking-widest animate-pulse">
                                未読
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-bold text-stone-950 truncate">
                              {rule.shortTitle}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-700 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded-xs bg-stone-900 text-stone-100 text-xs font-bold tracking-wider hover:bg-stone-800 cursor-pointer"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              ) : modalState.type === 'RULE' ? (
                <div>
                  <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4 pr-8">
                    <div>
                      <span className="text-xs font-mincho font-bold block text-stone-700">
                        {modalState.rule.subtitle}
                      </span>
                      <h3 className="font-mincho text-lg md:text-xl font-extrabold mt-0.5 text-stone-950">
                        {modalState.rule.title}
                      </h3>
                    </div>
                    {modalState.rule.stampText && (
                      <div className="border-2 border-red-800 text-red-800 font-mincho font-extrabold text-xs px-2 py-1 rotate-[-5deg] shrink-0 whitespace-nowrap">
                        {modalState.rule.stampText}
                      </div>
                    )}
                  </div>

                  <p className="font-mincho text-sm leading-relaxed mb-4 whitespace-pre-line text-stone-900">
                    {modalState.rule.content}
                  </p>

                  <div className="border-2 p-3 rounded-xs mb-4 font-mincho bg-red-900/15 border-red-800/80 text-red-950">
                    <div className="text-[11px] font-bold opacity-80 mb-0.5">
                      【絶対遵守事項】
                    </div>
                    <div className="text-sm font-extrabold">
                      {modalState.rule.highlightWarning}
                    </div>
                  </div>

                  {/* モーダル内で前後の張り紙を素早く切り替えるボタン */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-600/50 font-mincho">
                    <div className="flex flex-wrap gap-1">
                      {unlockedRules.map((r, i) => {
                        const isUnread = !readRuleIds.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              soundManager.playButtonClick('PAPER');
                              onSelectRule(r);
                            }}
                            className={`px-2 py-1 rounded-xs text-xs font-bold cursor-pointer border relative ${
                              r.id === modalState.rule.id
                                ? 'bg-stone-900 border-stone-900 text-amber-400'
                                : 'bg-stone-800/15 border-stone-600/50 hover:bg-stone-800/30 text-stone-800'
                            }`}
                          >
                            通達{i + 1}
                            {isUnread && (
                              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-600 align-middle" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded-xs bg-stone-900 text-stone-100 text-xs font-bold tracking-wider hover:bg-stone-800 cursor-pointer"
                    >
                      査読終了
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-stone-900 font-mincho">
                  {/* 手引書ヘッダー（公文書・朱印風デザイン） */}
                  <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2.5 mb-3 pr-8">
                    <div>
                      <span className="text-[11px] font-bold text-stone-700 tracking-wider block">
                        管理室 保安統制課 — 乗務規程（機密第15號）
                      </span>
                      <h3 className="text-lg md:text-xl font-extrabold text-stone-950 tracking-wide mt-0.5">
                        第十五號昇降機 運行手引書
                      </h3>
                    </div>
                    <div className="border-2 border-red-800 text-red-800 font-extrabold text-xs px-2 py-0.5 rotate-[-4deg] shrink-0 whitespace-nowrap">
                      規程遵守
                    </div>
                  </div>

                  {/* 罫線枠の条文テーブル（無機質で冷たい業務命令口調） */}
                  <div className="border-2 border-stone-800 divide-y divide-stone-700/80 bg-stone-900/5 text-xs leading-relaxed">
                    <div className="p-2 sm:p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>【第一条：扉の開閉と身元検閲】</span>
                        <span className="text-[10px] font-bold text-red-900 border border-red-800/60 px-1.5 py-0.2">
                          基本規程
                        </span>
                      </div>
                      <p className="text-stone-800">
                        到着時、扉は12%まで開く。「開扉」ボタンを長押しして隙間を広げ、胸元の名札・荷物・外見を照合しろ。扉を大きく開けた際に本性を現す個体も存在する。異常を確認した場合は即座に指を離し、「閉扉」で遮断しろ。（扉をこじ開けようとする個体には「閉扉」を連打して押し戻せ）
                      </p>
                    </div>

                    <div className="p-2 sm:p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>【第二条：急速換気装置の運用】</span>
                        <span className="text-[10px] font-bold text-stone-800 border border-stone-700 px-1.5 py-0.2">
                          車内設備
                        </span>
                      </div>
                      <p className="text-stone-800">
                        下降中、床下から有毒な瘴気が噴出した場合、および同乗者から換気の要求があった場合は、直ちに「急速換気」を起動しろ（3秒間強制排気される）。※異常のない平時に作動させ、乗客から苦情を受けた場合は規定違反として記録される。
                      </p>
                    </div>

                    <div className="p-2 sm:p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>【第三条：非常ベル連動・防衛レーザー】</span>
                        <span className="text-[10px] font-bold text-red-900 border border-red-800/60 px-1.5 py-0.2">
                          低層規程
                        </span>
                      </div>
                      <p className="text-stone-800">
                        5階以下の低層階を下降中、閉まった正面扉の鏡面に「背後の怪異」が映り込むことがある。鏡面に異常な影を確認した場合は、直ちに「非常ベル」を押せ。天井の高圧紫外線レーザーが作動し、対象を焼き払う。
                      </p>
                    </div>

                    <div className="p-2 sm:p-2.5">
                      <div className="font-extrabold text-stone-950 mb-0.5 flex items-center justify-between">
                        <span>【第四条：通達の改定と運行停止基準】</span>
                        <span className="text-[10px] font-bold text-stone-800 border border-stone-700 px-1.5 py-0.2">
                          懲戒基準
                        </span>
                      </div>
                      <p className="text-stone-800">
                        10階および5階の待機所で下達される追加通達は、従前の規則を上書きする。最新の通達を正確に把握し、規程に従って処理しろ。
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-red-900 font-bold">
                      ※規程違反および苦情3件累積により運行資格を剥奪する
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded-xs bg-stone-900 text-stone-100 text-xs font-bold tracking-wider hover:bg-stone-800 cursor-pointer shrink-0"
                    >
                      手引書を閉じる
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
