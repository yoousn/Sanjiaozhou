import React from "react";
import { cn } from "../../utils";

export function CommunityToolbar({
  sort,
  onSortChange,
  activeTag,
  onTagChange,
  onOpenComposer,
}: {
  sort: "new" | "hot";
  onSortChange: (sort: "new" | "hot") => void;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  onOpenComposer: () => void;
}) {
  const commonTags = ["满改", "跑刀", "大金", "白给", "修脚"];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSortChange("new")}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-bold transition",
            sort === "new"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
          )}
        >
          最新
        </button>
        <button
          onClick={() => onSortChange("hot")}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-bold transition",
            sort === "hot"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
          )}
        >
          热门
        </button>
        <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {commonTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagChange(tag === activeTag ? null : tag)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[12px] font-bold transition border",
              activeTag === tag
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
            )}
          >
            #{tag}
          </button>
        ))}
      </div>
      <button
        onClick={onOpenComposer}
        className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[13px] font-black hover:opacity-90 transition shrink-0"
      >
        发布帖子
      </button>
    </div>
  );
}
