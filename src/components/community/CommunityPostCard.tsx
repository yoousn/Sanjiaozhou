import React, { useState, useEffect } from "react";
import type { CommunityPost, CommunityReactions } from "../../types";
import { Trash2, MessageCircle, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";

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
  onDelete,
  onFetchComments,
  onAddComment,
  onDeleteComment,
}: {
  post: CommunityPost;
  onReact: (postId: string, emoji: keyof CommunityReactions) => void;
  onTagClick: (tag: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onFetchComments?: (postId: string) => Promise<void>;
  onAddComment?: (postId: string, content: string, author: string) => Promise<void>;
  onDeleteComment?: (postId: string, commentId: string) => Promise<void>;
}) {
  const [reacting, setReacting] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [authorName, setAuthorName] = useState(() => localStorage.getItem("comment_author") || "");
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const toggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && onFetchComments && !post.comments) {
      setLoadingComments(true);
      await onFetchComments(post.id);
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !authorName.trim() || submitting || !onAddComment) return;

    setSubmitting(true);
    try {
      localStorage.setItem("comment_author", authorName);
      await onAddComment(post.id, commentContent, authorName);
      setCommentContent("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("确定要删除这条帖子吗？")) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
      setIsDeleting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    if (!window.confirm("确定要删除这条评论吗？")) return;
    try {
      await onDeleteComment(post.id, commentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除评论失败");
    }
  };

  return (
    <div className={`bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}>
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-2 bg-black/20 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors z-10 opacity-0 hover:opacity-100 group-hover:opacity-100"
          style={{ opacity: 0.6 }} // Make it slightly visible by default since we don't have a 'group' class on parent easily without changing it
          title="删除帖子"
        >
          <Trash2 size={14} />
        </button>
      )}

      {post.imageUrl && (
        <a href={post.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={post.imageUrl}
            alt={post.description || "帖子图片"}
            className="w-full aspect-[4/3] object-cover"
            loading="lazy"
          />
        </a>
      )}
      
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
            <button
              onClick={toggleComments}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] font-bold transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${showComments ? "text-blue-500" : "text-zinc-500"}`}
            >
              <MessageCircle size={14} />
              <span>{post.comments?.length || ""}</span>
            </button>
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

        {/* 评论区 */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-slide-up">
            <div className="flex flex-col gap-3 mb-4">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-zinc-400" />
                </div>
              ) : post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div key={comment.id} className="group flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      {onDeleteComment && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-normal bg-zinc-50 dark:bg-white/[0.02] p-2 rounded-lg">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-zinc-400 text-center py-2">暂无评论</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="你的昵称"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-[11px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none"
              />
              <div className="relative">
                <textarea
                  placeholder="写下你的评论..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  required
                  rows={1}
                  className="w-full px-3 py-2 pr-10 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-[12px] focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentContent.trim() || !authorName.trim()}
                  className="absolute right-2 bottom-2 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
