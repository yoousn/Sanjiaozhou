import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils';
import { GunVariant } from '../types';
import { overlayFade, scaleIn } from './motionPresets';

const CATEGORY_OPTIONS: Array<{ value: string; label: string; short: string }> = [
  { value: 'ar', short: 'AR', label: '突击步枪' },
  { value: 'br', short: 'BR', label: '战斗步枪' },
  { value: 'smg', short: 'SMG', label: '冲锋枪' },
  { value: 'lmg', short: 'LMG', label: '轻机枪' },
  { value: 'dmr', short: 'DMR', label: '精准射手' },
  { value: 'sr', short: 'SR', label: '狙击步枪' },
  { value: 'pistol', short: 'P', label: '手枪' },
];

const TIER_OPTIONS = ['T0', 'T1', 'T2'];
const BUILD_TYPE_SUGGESTIONS = ['满改', '半改', '丐版', '特殊版', '平民改', '高性价比', '竞速', '潜行'];

const fieldLabelClass = 'block text-[11px] font-black text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-widest';
const fieldInputClass = 'w-full h-11 px-3 text-[14px] font-bold text-zinc-900 dark:text-white bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm outline-none transition focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-400 dark:focus:ring-white/10 placeholder:text-zinc-400 placeholder:font-medium';

export function AddGunModal({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (name: string, category: string, variant: Omit<GunVariant, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ar');
  const [tier, setTier] = useState('T1');
  const [price, setPrice] = useState('');
  const [buildType, setBuildType] = useState('满改');
  const [code, setCode] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    onConfirm(name, category, {
      tier,
      price,
      buildType: (buildType || '').trim() || '默认配置',
      code,
      date: new Date().toISOString().split('T')[0],
      author,
      sourceUrl,
      locked: false,
    });
    setName(''); setCategory('ar'); setTier('T1'); setPrice(''); setBuildType('满改'); setCode(''); setAuthor(''); setSourceUrl('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 overscroll-contain" onWheel={(event) => event.stopPropagation()}>
        <motion.div
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          onClick={onClose}
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="exit"
        />

        <motion.div
          className="w-full max-w-xl bg-white dark:bg-[#121214] rounded-3xl shadow-2xl relative z-10 border border-white/20 dark:border-zinc-800 my-auto overflow-hidden"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* 头部：渐变背景 + 标题 */}
          <div className="relative px-6 pt-6 pb-5 md:px-8 md:pt-7 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-500/5 dark:to-transparent border-b border-zinc-100 dark:border-zinc-800">
            <button type="button" onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full p-1.5 outline-none focus:ring-2 focus:ring-zinc-900/20 shadow-sm border border-zinc-200/60 dark:border-zinc-700">
              <X size={16} strokeWidth={2.5}/>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white inline-flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">新增枪械体系</h2>
                <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">填写下方信息以创建新的改枪卡片</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 md:px-8 md:py-7 max-h-[70vh] overflow-y-auto">
            {/* 基础信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelClass}>体系名称 / 型号 <span className="text-red-500">*</span></label>
                <input required autoFocus className={fieldInputClass} placeholder="如：M4A1、AKM、HK416…" value={name} onChange={r => setName(r.target.value)} />
              </div>
              <div>
                <label className={fieldLabelClass}>所属图鉴分类</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map(opt => {
                    const active = category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        className={cn(
                          'h-9 px-2.5 rounded-lg text-[11px] font-black tracking-wide transition border inline-flex items-center gap-1',
                          active
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm'
                            : 'bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                        )}
                      >
                        <span className="opacity-70">{opt.short}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 评级 / 金额 / 配置方案 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={fieldLabelClass}>评级</label>
                <div className="inline-flex h-11 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 w-full">
                  {TIER_OPTIONS.map(t => {
                    const active = t === tier;
                    const tierBg: Record<string, string> = {
                      T0: 'bg-orange-500 text-white',
                      T1: 'bg-purple-500 text-white',
                      T2: 'bg-blue-500 text-white',
                    };
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTier(t)}
                        className={cn(
                          'flex-1 rounded-lg text-[12px] font-black tracking-wider transition',
                          active ? tierBg[t] || 'bg-zinc-900 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={fieldLabelClass}>金额（≈）<span className="text-red-500">*</span></label>
                <input required className={fieldInputClass} placeholder="如 15W、8.5W" value={price} onChange={r => setPrice(r.target.value)} />
              </div>
              <div>
                <label className={fieldLabelClass}>配置方案（可自定义）</label>
                <input
                  className={fieldInputClass}
                  placeholder="如 满改 / 高性价比 / 自定义…"
                  value={buildType}
                  onChange={r => setBuildType(r.target.value)}
                  list="addgun-buildtype-suggestions"
                />
                <datalist id="addgun-buildtype-suggestions">
                  {BUILD_TYPE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {BUILD_TYPE_SUGGESTIONS.slice(0, 4).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBuildType(s)}
                      className={cn(
                        'h-6 px-2 text-[10px] font-bold rounded border transition',
                        buildType === s
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                          : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 dark:bg-[#18181b] dark:border-zinc-700 dark:text-zinc-400'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 改枪代码 */}
            <div>
              <label className={fieldLabelClass}>改枪游戏代码 (Code) <span className="text-red-500">*</span></label>
              <input
                required
                className={cn(fieldInputClass, 'font-mono tracking-tight')}
                placeholder="Delta-XXXXXXXXXXXX…"
                value={code}
                onChange={r => setCode(r.target.value)}
              />
            </div>

            {/* 来源 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelClass}>来源作者</label>
                <input className={fieldInputClass} placeholder="UP 主名 / 来源" value={author} onChange={r => setAuthor(r.target.value)} />
              </div>
              <div>
                <label className={fieldLabelClass}>来源链接</label>
                <input className={fieldInputClass} placeholder="https://…" value={sourceUrl} onChange={r => setSourceUrl(r.target.value)} />
              </div>
            </div>
          </form>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 md:px-8 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
            <span className="text-[11px] font-medium text-zinc-400">带 <span className="text-red-500">*</span> 为必填项</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-10 rounded-xl bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-200 font-bold text-[13px] border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                className="px-5 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[13px] tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-100 transition shadow-lg shadow-zinc-900/10 focus:outline-none focus:ring-4 focus:ring-zinc-900/15"
              >
                完成添加
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
