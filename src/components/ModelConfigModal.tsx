import React, { useMemo, useState } from 'react';
import { Bot, Check, Loader2, MessageSquare, Plus, Save, Search, Send, TestTube2, Trash2, X } from 'lucide-react';
import { cn, inputClasses, parseModelOptionValue } from '../utils';
import type { CollectMeta, CollectModelProviderInput, ModelTestResult } from '../types';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  latencyMs?: number;
};

type ModelChatResult = {
  success: boolean;
  model: string;
  content?: string;
  reasoning?: string;
  latencyMs?: number;
  error?: string;
};

export function ModelConfigModal({
  onClose,
  meta,
  selectedProviderId,
  selectedModel,
  providerForm,
  fetchedModels,
  isFetchingProviderModels,
  isSavingProvider,
  isTestingModel,
  modelTestResult,
  onSelectedProviderIdChange,
  onSelectedModelChange,
  onProviderFormChange,
  onFetchProviderModels,
  onSaveProvider,
  onDeleteProvider,
  onTestModel,
  onChatModel,
}: {
  onClose: () => void;
  meta: CollectMeta;
  selectedProviderId: string;
  selectedModel: string;
  providerForm: CollectModelProviderInput;
  fetchedModels: string[];
  isFetchingProviderModels: boolean;
  isSavingProvider: boolean;
  isTestingModel: boolean;
  modelTestResult: ModelTestResult | null;
  onSelectedProviderIdChange: (providerId: string) => void;
  onSelectedModelChange: (model: string) => void;
  onProviderFormChange: React.Dispatch<React.SetStateAction<CollectModelProviderInput>>;
  onFetchProviderModels: () => void;
  onSaveProvider: () => void;
  onDeleteProvider: () => void;
  onTestModel: (model: string) => Promise<void> | void;
  onChatModel: (model: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<ModelChatResult>;
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState('');

  const selectedProvider = meta.providers.find((provider) => provider.id === selectedProviderId) || meta.providers[0];
  const modelOptions = useMemo(() => meta.modelOptions.filter((option) => option.providerId === selectedProviderId), [meta.modelOptions, selectedProviderId]);
  const activeModel = selectedModel || meta.defaultModel || modelOptions[0]?.value || '';
  const parsedActiveModel = parseModelOptionValue(activeModel);
  const availableModels = useMemo(() => [...new Set([...providerForm.models, ...fetchedModels])], [providerForm.models, fetchedModels]);
  const formModelSet = new Set(providerForm.models);

  const toggleModel = (model: string) => {
    onProviderFormChange((prev) => {
      const exists = prev.models.includes(model);
      const models = exists ? prev.models.filter((item) => item !== model) : [...prev.models, model];
      const selectedModel = models.includes(prev.selectedModel || '') ? prev.selectedModel : (models[0] || '');
      return { ...prev, models, selectedModel };
    });
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || !activeModel || isChatting) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatError('');
    setIsChatting(true);
    try {
      const result = await onChatModel(activeModel, nextMessages.map(({ role, content }) => ({ role, content })));
      if (!result.success) throw new Error(result.error || '模型回复失败');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.content || '', reasoning: result.reasoning, latencyMs: result.latencyMs }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : '模型回复失败');
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60" onClick={onClose} />
      <div className="relative z-10 flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#121214]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">模型配置</h3>
            <p className="mt-1 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">启用模型、测试连通性，并在操练场直接对话</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[220px_1fr_360px]">
          <aside className="border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-[#18181b] lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">模型源</span>
              <button
                type="button"
                onClick={() => {
                  onSelectedProviderIdChange('');
                  onProviderFormChange({ id: '', name: '', baseUrl: '', apiKey: '', models: [], selectedModel: '' });
                }}
                className="rounded-xl bg-white p-2 text-zinc-500 hover:text-zinc-900 dark:bg-[#121214] dark:hover:text-white"
                title="新增模型源"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="space-y-2">
              {meta.providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => onSelectedProviderIdChange(provider.id)}
                  className={cn(
                    'w-full rounded-2xl border px-3 py-3 text-left transition',
                    selectedProviderId === provider.id
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#121214] dark:text-zinc-400'
                  )}
                >
                  <div className="truncate text-[13px] font-black">{provider.name}</div>
                  <div className="mt-1 text-[11px] font-bold opacity-70">{provider.models.length} 个启用模型</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">名称</label>
                <input value={providerForm.name} onChange={(e) => onProviderFormChange((prev) => ({ ...prev, name: e.target.value }))} className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] shadow-sm dark:border-zinc-800 dark:bg-[#18181b] dark:text-white')} placeholder="我的接口" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">接口地址</label>
                <input value={providerForm.baseUrl} onChange={(e) => onProviderFormChange((prev) => ({ ...prev, baseUrl: e.target.value }))} className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] shadow-sm dark:border-zinc-800 dark:bg-[#18181b] dark:text-white')} placeholder="https://api.example.com/v1" />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">API Key</label>
              <input value={providerForm.apiKey} onChange={(e) => onProviderFormChange((prev) => ({ ...prev, apiKey: e.target.value }))} className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] shadow-sm dark:border-zinc-800 dark:bg-[#18181b] dark:text-white')} placeholder="sk-..." />
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-[#18181b]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-black text-zinc-900 dark:text-white">启用模型</div>
                  <div className="mt-1 text-[11px] font-medium text-zinc-400">获取模型后勾选要参与自动采集和操练场的模型</div>
                </div>
                <button type="button" onClick={onFetchProviderModels} disabled={isFetchingProviderModels || isSavingProvider} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-black text-zinc-700 transition hover:border-zinc-300 disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121214] dark:text-zinc-300">
                  {isFetchingProviderModels ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} strokeWidth={2.5} />}
                  获取模型
                </button>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {availableModels.length > 0 ? availableModels.map((model) => (
                  <label key={model} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#121214] dark:text-zinc-300">
                    <span className="truncate">{model}</span>
                    <input type="checkbox" checked={formModelSet.has(model)} onChange={() => toggleModel(model)} className="h-4 w-4 accent-zinc-900" />
                  </label>
                )) : (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-[12px] font-bold text-zinc-400 dark:border-zinc-800 dark:bg-[#121214]">暂无模型，请先获取模型</div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">默认模型</label>
                <select value={providerForm.selectedModel || ''} onChange={(e) => onProviderFormChange((prev) => ({ ...prev, selectedModel: e.target.value }))} className={cn(inputClasses, 'border border-zinc-200 bg-white py-2 text-[13px] shadow-sm dark:border-zinc-800 dark:bg-[#18181b] dark:text-white')}>
                  <option value="">请选择模型</option>
                  {providerForm.models.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={onDeleteProvider} disabled={!providerForm.id || isSavingProvider} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[12px] font-black text-red-700 disabled:opacity-50">
                  <Trash2 size={14} strokeWidth={2.5} /> 删除
                </button>
                <button type="button" onClick={onSaveProvider} disabled={isSavingProvider || isFetchingProviderModels} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-[12px] font-black text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900">
                  {isSavingProvider ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />} 保存生效
                </button>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-[#18181b] lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <Bot size={16} />
              <div>
                <div className="text-[13px] font-black text-zinc-900 dark:text-white">模型操练场</div>
                <div className="text-[11px] font-bold text-zinc-400">{selectedProvider?.name || '未选择模型源'} / {parsedActiveModel.model || '未选择模型'}</div>
              </div>
            </div>
            <select value={activeModel} onChange={(e) => onSelectedModelChange(e.target.value)} className="mb-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold outline-none dark:border-zinc-800 dark:bg-[#121214] dark:text-white">
              <option value="">请选择模型</option>
              {(modelOptions.length > 0 ? modelOptions : meta.modelOptions).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button type="button" onClick={() => void onTestModel(activeModel)} disabled={!activeModel || isTestingModel} className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-black text-zinc-700 disabled:opacity-60 dark:border-zinc-800 dark:bg-[#121214] dark:text-zinc-300">
              {isTestingModel ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
              测试模型
            </button>
            {modelTestResult && (
              <div className={cn('mb-3 rounded-xl px-3 py-2 text-[11px] font-bold', modelTestResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700')}>
                {modelTestResult.success ? <Check size={13} className="mr-1 inline" /> : null}{modelTestResult.success ? `测试通过 · ${modelTestResult.latencyMs}ms` : modelTestResult.error || '测试失败'}
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-[#121214]">
              {chatMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-[12px] font-bold text-zinc-400">
                  <MessageSquare size={22} className="mb-2" />
                  像 New API 操练场一样直接发送测试消息
                </div>
              ) : chatMessages.map((message, index) => (
                <div key={index} className={cn('rounded-2xl px-3 py-2 text-[12px] leading-relaxed', message.role === 'user' ? 'ml-8 bg-zinc-900 text-white' : 'mr-8 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200')}>
                  {message.reasoning && <details className="mb-2 rounded-xl bg-white/60 p-2 text-[11px] dark:bg-black/20"><summary className="cursor-pointer font-black">思考内容</summary><div className="mt-1 whitespace-pre-wrap opacity-80">{message.reasoning}</div></details>}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.latencyMs ? <div className="mt-1 text-[10px] opacity-50">{message.latencyMs}ms</div> : null}
                </div>
              ))}
              {isChatting && <div className="mr-8 inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-[12px] font-bold text-zinc-500 dark:bg-zinc-800"><Loader2 size={14} className="animate-spin" /> 思考中...</div>}
            </div>

            {chatError && <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{chatError}</div>}
            <form onSubmit={handleSend} className="mt-3 flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isChatting} placeholder="输入消息..." className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold outline-none dark:border-zinc-800 dark:bg-[#121214] dark:text-white" />
              <button type="submit" disabled={!chatInput.trim() || !activeModel || isChatting} className="rounded-xl bg-zinc-900 px-3 text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                <Send size={15} />
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
