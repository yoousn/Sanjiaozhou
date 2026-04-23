import React from 'react';
import { Trash2, Check, Copy, Lock, Unlock, ExternalLink } from 'lucide-react';
import { cn, inputClasses } from '../utils';
import { GunVariant } from '../types';

export function VariantItem({
  variant,
  isEditing,
  onUpdateVariant,
  onDeleteVariant,
  copiedId,
  handleCopy
}: {
  variant: GunVariant,
  isEditing: boolean,
  onUpdateVariant: (vid: string, field: keyof GunVariant, val: string | boolean) => void,
  onDeleteVariant: (vid: string) => void,
  copiedId: string | null,
  handleCopy: (code: string, id: string) => void
}) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, field: keyof GunVariant) => {
    if (e.target.value !== variant[field]) {
      onUpdateVariant(variant.id, field, e.target.value);
    }
  };

  const tierColors: Record<string, string> = {
    'T0': 'bg-orange-500 text-white border-orange-600 shadow-[inset_0_1px_rgba(255,255,255,0.4)]',
    'T1': 'bg-purple-500 text-white border-purple-600 shadow-[inset_0_1px_rgba(255,255,255,0.4)]',
    'T2': 'bg-blue-500 text-white border-blue-600 shadow-[inset_0_1px_rgba(255,255,255,0.4)]',
  };
  const badgeColor = tierColors[variant.tier?.toUpperCase()] || 'bg-zinc-800 text-white border-zinc-900';

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-zinc-50 border-2 border-emerald-500/20 shadow-sm transition group/edit">
        <div className="flex gap-1.5 items-center">
          <input className={cn(inputClasses, "py-1 px-1.5 w-9 text-[11px] font-bold text-center bg-white border border-zinc-200")} defaultValue={variant.tier} onBlur={e => handleBlur(e, 'tier')} placeholder="T1" />
          <input className={cn(inputClasses, "py-1 px-1.5 w-14 text-[11px] font-bold bg-white border border-zinc-200")} defaultValue={variant.price} onBlur={e => handleBlur(e, 'price')} placeholder="金额" />
          <select className={cn(inputClasses, "py-1 px-1.5 flex-1 text-[11px] font-bold bg-white border border-zinc-200 cursor-pointer")} defaultValue={variant.buildType} onBlur={e => handleBlur(e, 'buildType')}>
            <option value="满改">满改</option>
            <option value="半改">半改</option>
            <option value="丐版">丐版</option>
            <option value="特殊版">特殊版</option>
          </select>
          <button
            type="button"
            onClick={() => onUpdateVariant(variant.id, 'locked', !variant.locked)}
            className={cn(
              'shrink-0 p-1.5 rounded-lg transition duration-200 active:scale-90 outline-none border',
              variant.locked ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-zinc-400 hover:text-zinc-700 bg-white border-zinc-200'
            )}
            title={variant.locked ? '已锁定' : '未锁定'}
          >
            {variant.locked ? <Lock size={14} strokeWidth={2.5}/> : <Unlock size={14} strokeWidth={2.5}/>}
          </button>
          <button
            type="button"
            onClick={() => onDeleteVariant(variant.id)}
            className="shrink-0 p-1.5 text-zinc-400 border border-transparent hover:border-red-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200 active:scale-90 outline-none"
            title="删除此配置"
          >
            <Trash2 size={14} strokeWidth={2.5}/>
          </button>
        </div>
        <div className="relative flex items-center">
          <input className={cn(inputClasses, "w-full text-[12px] font-mono font-bold tracking-tight py-1.5 bg-white border border-zinc-200")} defaultValue={variant.code} onBlur={e => handleBlur(e, 'code')} placeholder="改枪代码..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={cn(inputClasses, "py-1.5 text-[11px] bg-white border border-zinc-200")} defaultValue={variant.author || ''} onBlur={e => handleBlur(e, 'author')} placeholder="来源作者" />
          <input className={cn(inputClasses, "py-1.5 text-[11px] bg-white border border-zinc-200")} defaultValue={variant.sourceUrl || ''} onBlur={e => handleBlur(e, 'sourceUrl')} placeholder="来源链接" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2 md:p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-200/60 hover:border-zinc-300 hover:bg-zinc-50 transition-colors duration-200 group/variant">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-block text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded-[4px] border leading-none", badgeColor)}>
            {variant.tier || '-'}
          </span>
          {variant.price && (
            <span className="text-[10px] font-bold text-zinc-700 bg-white px-1.5 py-0.5 rounded-[4px] border border-zinc-200 shadow-sm shrink-0 leading-none">
              {variant.price}
            </span>
          )}
          <span className="text-[12px] font-black text-zinc-900 tracking-tight leading-none px-1">
            {variant.buildType || '默认配置'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {variant.locked && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none">
              <Lock size={10} strokeWidth={2.5} />
              已锁定
            </div>
          )}
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-white border border-zinc-200 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none">
            {variant.date}
          </div>
        </div>
      </div>

      <div className="mt-0.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 px-2.5 py-2 rounded-lg bg-white border border-zinc-200/80 flex items-center overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
            <code className="text-[11px] text-zinc-600 group-hover/variant:text-zinc-900 font-mono tracking-wide font-bold text-left truncate transition-colors">
              {variant.code || '暂无代码'}
            </code>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => handleCopy(variant.code, variant.id)}
              className={cn(
                "shrink-0 p-2 rounded-lg border border-zinc-200 shadow-sm cursor-pointer transition duration-200 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 active:scale-95 group/btn relative overflow-hidden",
                copiedId === variant.id ? "bg-emerald-500 text-white border-emerald-600 shadow-[inset_0_1px_rgba(255,255,255,0.4)]" : "bg-white hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
              )}
              title="复制代码"
            >
              {copiedId === variant.id ? <Check size={14} className="shrink-0" strokeWidth={3}/> : <Copy size={14} className="text-zinc-500 transition-colors group-hover/btn:text-white shrink-0" strokeWidth={2.5}/>}
            </button>

            {copiedId === variant.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -mt-10 px-2 py-1 bg-zinc-900 text-white text-[11px] font-bold tracking-wider rounded border border-zinc-800 shadow-md pointer-events-none z-20 flex items-center gap-1 whitespace-nowrap">
                复制成功
                <div className="absolute -bottom-1 right-2 w-2 h-2 bg-zinc-900 rotate-45 transform border-b border-r border-zinc-800" />
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 font-medium px-1 flex items-center justify-between gap-2">
          <span className="truncate">来源: {variant.author || '未知来源'}</span>
          {variant.sourceUrl && (
            <a href={variant.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 transition-colors">
              <ExternalLink size={11} strokeWidth={2.5} />
              原视频
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
