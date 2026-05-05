import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, inputClasses } from '../utils';
import { GunVariant } from '../types';
import { overlayFade, scaleIn } from './motionPresets';

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
      buildType,
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 overscroll-contain" onWheel={(event) => event.stopPropagation()}>
        <motion.div
          className="absolute inset-0 bg-zinc-900/60"
          onClick={onClose}
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="exit"
        />

        <motion.div
          className="w-full max-w-md bg-white dark:bg-[#121214] rounded-3xl shadow-2xl p-6 md:p-8 relative z-10 border border-white/20 dark:border-zinc-800"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <button type="button" onClick={onClose} className="absolute right-6 top-6 text-muted hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full p-2 outline-none focus:ring-2 focus:ring-zinc-900/20">
          <X size={18} strokeWidth={2.5}/>
        </button>

        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <Sparkles size={22} className="text-emerald-500" />
          新增枪械体系
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">体系名称/型号</label>
              <input required autoFocus className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} placeholder="e.g. M4A1..." value={name} onChange={r => setName(r.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">所属图鉴分类</label>
              <select className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} value={category} onChange={r => setCategory(r.target.value)}>
                <option value="ar">突击步枪 (AR)</option>
                <option value="br">战斗步枪 (BR)</option>
                <option value="smg">冲锋枪 (SMG)</option>
                <option value="lmg">轻机枪 (LMG)</option>
                <option value="dmr">精准射手步枪 (DMR)</option>
                <option value="sr">狙击步枪 (SR)</option>
                <option value="pistol">手枪 (Pistol)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">评级</label>
              <select className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} value={tier} onChange={r => setTier(r.target.value)}>
                <option value="T0">T0</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">金额(≈)</label>
              <input required className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} placeholder="15W" value={price} onChange={r => setPrice(r.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">配置方案</label>
              <select className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} value={buildType} onChange={r => setBuildType(r.target.value)}>
                <option value="满改">满改</option>
                <option value="半改">半改</option>
                <option value="丐版">丐版</option>
                <option value="特殊版">特殊版</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">改枪游戏代码 (Code)</label>
            <input required className={cn(inputClasses,"py-3 font-mono bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} placeholder="Delta-XXX..." value={code} onChange={r => setCode(r.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">来源作者</label>
              <input className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} placeholder="UP主名" value={author} onChange={r => setAuthor(r.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">来源链接</label>
              <input className={cn(inputClasses,"py-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm")} placeholder="https://..." value={sourceUrl} onChange={r => setSourceUrl(r.target.value)} />
            </div>
          </div>

          <button type="submit" className="mt-4 w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black tracking-widest uppercase hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:scale-[1.02] transition-all focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:outline-none shadow-xl shadow-zinc-900/10">
          完成添加
        </button>
        </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
