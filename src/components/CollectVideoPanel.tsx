import React from 'react';
import { Loader2, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';
import type { CollectSearchResult, CollectSearchLog } from '../types';

export function CollectVideoPanel({
  searchResult,
  selectedVideoIds,
  isSearching,
  onToggleVideo,
}: {
  searchResult: CollectSearchResult;
  selectedVideoIds: string[];
  isSearching: boolean;
  onToggleVideo: (videoId: string) => void;
}) {
  const hasSearchErrors = Boolean(searchResult?.errors && searchResult.errors.length > 0);
  const hasSearchVideos = searchResult.videos.length > 0;
  const searchLogs = searchResult.logs || [];
  const visibleSearchLogs: CollectSearchLog[] = [...searchLogs].reverse();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-zinc-900">命中视频</h3>
          <p className="mt-1 text-[12px] font-medium text-zinc-400">搜索后显示在这里，可多选</p>
        </div>
        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold text-zinc-600">
          已选 {selectedVideoIds.length}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {hasSearchErrors && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
            {(searchResult.errors || []).join('；')}
          </div>
        )}

        {!isSearching && !hasSearchVideos && !hasSearchErrors && (
          <>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
              <Sparkles size={22} className="mb-3 text-zinc-300" />
              <p className="text-sm font-bold text-zinc-700">这里会显示搜索命中的视频</p>
              <p className="mt-1 text-[12px] font-medium text-zinc-400">将展示博主最新视频，无论是否匹配皆可手动勾选</p>
            </div>

            <div className="min-h-[220px] rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-zinc-700">搜索实时记录</h4>
                  <p className="mt-1 text-[12px] font-medium text-zinc-400">搜索完成后，这里保留最近一次记录</p>
                </div>
                <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold text-zinc-500">
                  {searchLogs.length} 条
                </div>
              </div>

              <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto pr-2">
                {visibleSearchLogs.length > 0 ? visibleSearchLogs.map((log) => (
                  <div key={`${log.timestamp}-${log.stage}-${log.videoId || ''}`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-600">
                    {log.message}
                  </div>
                )) : (
                  <div className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white text-center text-[12px] font-medium text-zinc-400">
                    {searchResult.isPending ? '正在等待服务器返回搜索日志…' : '暂无搜索记录'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isSearching && (
          <>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-zinc-100 bg-zinc-50 text-center">
              <Loader2 size={22} className="mb-3 animate-spin text-emerald-500" />
              <p className="text-sm font-bold text-zinc-700">正在搜索视频</p>
              <p className="mt-1 text-[12px] font-medium text-zinc-400">正在抓取并分析博主最新视频...</p>
            </div>

            <div className="min-h-[220px] rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-zinc-700">搜索实时记录</h4>
                  <p className="mt-1 text-[12px] font-medium text-zinc-400">用于显示搜索阶段发生了什么</p>
                </div>
                <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold text-zinc-500">
                  {searchLogs.length} 条
                </div>
              </div>

              <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto pr-2">
                {visibleSearchLogs.length > 0 ? visibleSearchLogs.map((log) => (
                  <div key={`${log.timestamp}-${log.stage}-${log.videoId || ''}`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-600">
                    {log.message}
                  </div>
                )) : (
                  <div className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white text-center text-[12px] font-medium text-zinc-400">
                    正在等待服务器返回搜索日志…
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {hasSearchVideos && (searchResult.videos || []).map((video) => {
          if (!video) return null;
          const checked = selectedVideoIds.includes(video.id);
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onToggleVideo(video.id)}
              className={cn(
                'w-full rounded-2xl border p-4 text-left transition',
                checked ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px] font-black text-zinc-900">{video.title}</div>
                  <div className="mt-2 text-[11px] font-medium text-zinc-500">{video.author} · {video.uploadDate || '未知日期'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(video.matchedIn || []).length > 0 ? (
                      (video.matchedIn || []).map((item) => (
                        <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          {item === 'title' ? '标题命中预设' : '简介命中预设'}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                        常规候选 (可手动勾选)
                      </span>
                    )}
                  </div>
                </div>
                <div className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300 bg-white text-transparent')}>
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  <ExternalLink size={11} strokeWidth={2.5} />
                  打开视频
                </a>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
