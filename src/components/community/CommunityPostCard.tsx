import React, { useState } from "react";
import type { CommunityPost, CommunityReactions } from "../../types";

const EMOJIS: Array<{ key: keyof CommunityReactions; emoji: string; label: string }> = [
  { key: "fire", emoji: "🔥", label: "火" },
  { key: "money", emoji: "💰", label: "钱" },
  { key: "skull", emoji: "💀", label: "骷髅" },
];

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return "刚刚";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
    return d.toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

export function CommunityPostCard({
  post,
  onReact,
  onTagClick,
}: {
  post: CommunityPost;
  onReact: (postId: string, emoji: keyof CommunityReactions) => void;
  onTagClick: (tag: string) => void;
}) {
  const [reacting, setReacting] = useState<string | null>(null);

  const handleReact = async (emoji: keyof CommunityReactions) => {
    if (reacting) return;
    setReacting(emoji);
    try {
      await onReact(post.id, emoji);
    } catch {
      // silently fail, optimistic UI already applied
    } finally {
      setReacting(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <a href={post.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={post.imageUrl}
          alt={post.description || "帖子图片"}
          className="w-full aspect-[4/3] object-cover"
          loading="lazy"
        />
      </a>
      <div className="p-4">
        {post.description && (
          <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-3 leading-relaxed">
            {post.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              #{tag}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-bold">{post.uploader}</span>
            <span>·</span>
            <span>{formatTime(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            {EMOJIS.map(({ key, emoji, label }) => (
              <button
                key={key}
                onClick={() => void handleReact(key)}
                disabled={reacting !== null}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[12px] font-bold transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                title={label}
              >
                <span>{emoji}</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {post.reactions[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
