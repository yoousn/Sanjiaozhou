import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils";
import type { CommunityPost, CommunityReactions } from "../../types";
import { Trash2, MessageCircle, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";

const EMOJIS: Array<{ key: keyof CommunityReactions; emoji: string; label: string }> = [
  { key: "fire", emoji: "👍", label: "赞" },
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

const LazyImage = React.memo(function LazyImage({ src, alt, className }: { src: string, alt: string, className: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative bg-zinc-100 dark:bg-zinc-800 overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-200 dark:bg-zinc-700" />}
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
});

export const CommunityPostCard = React.memo(function CommunityPostCard({
  post,
  onReact,
  onTagClick,
  onDelete,
  onFetchComments,
  onAddComment,
  onDeleteComment,
  auth,
  showToast,
}: {
  post: CommunityPost;
  onReact: (postId: string, emoji: keyof CommunityReactions, userId: string) => void;
  onTagClick: (tag: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onFetchComments?: (postId: string) => Promise<void>;
  onAddComment?: (postId: string, content: string, author: string) => Promise<void>;
  onDeleteComment?: (postId: string, commentId: string) => Promise<void>;
  auth: any;
  showToast?: (msg: string, type?: 'success' | 'warn' | 'error') => void;
}) {
  const [reacting, setReacting] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(true);
  const [previewImage, setPreviewImage] = useState(false);
  const [imgScale, setImgScale] = useState(1);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posAtDragStart, setPosAtDragStart] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const closePreview = useCallback(() => {
    setPreviewImage(false);
    setImgScale(1);
    setImgPos({ x: 0, y: 0 });
  }, []);

  // Non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !previewImage) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setImgScale((prev) => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const next = Math.min(Math.max(prev + delta, 1), 8);
        if (next <= 1) setImgPos({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [previewImage]);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 身份逻辑：登录显示用户名，不登录显示匿名用户
  const currentAuthorName = auth.isAuthenticated ? auth.user.username : "匿名用户";

  // 初始化时自动获取评论
  useEffect(() => {
    if (onFetchComments && !post.comments) {
      void onFetchComments(post.id);
    }
  }, [post.id, onFetchComments, post.comments]);

  const handleReact = async (emoji: keyof CommunityReactions) => {
    if (!auth?.isAuthenticated) {
      throw new Error("请先登录才能进行互动");
    }
    if (reacting) return;
    setReacting(emoji);
    try {
      await onReact(post.id, emoji, auth.user.id);
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
      try {
        await onFetchComments(post.id);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || submitting || !onAddComment) return;

    setSubmitting(true);
    try {
      await onAddComment(post.id, commentContent, currentAuthorName);
      setCommentContent("");
      showToast?.('评论成功！');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "评论失败";
      showToast?.(msg, 'error');
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
      showToast?.('帖子已删除');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast?.(msg, 'error');
      setIsDeleting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    if (!window.confirm("确定要删除这条评论吗？")) return;
    try {
      await onDeleteComment(post.id, commentId);
      showToast?.('评论已删除');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除评论失败";
      showToast?.(msg, 'error');
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
        <button type="button" onClick={() => setPreviewImage(true)} className="block w-full">
          <LazyImage
            src={post.thumbUrl || post.imageUrl}
            alt={post.description || "帖子图片"}
            className="w-full aspect-[4/3]"
          />
        </button>
      )}
      
      <div className="p-4">
        {post.description && (
          <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-3 leading-relaxed">
            {post.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(post.tags || []).map((tag) => (
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
              <span>{post.comments?.length ?? 0}</span>
            </button>
            {EMOJIS.map(({ key, emoji, label }) => {
              const hasReacted = auth?.isAuthenticated && post.reactedUsers?.[key]?.includes(auth.user.id);
              return (
                <button
                  key={key}
                  onClick={() => void handleReact(key)}
                  disabled={reacting !== null}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[12px] font-bold transition disabled:opacity-50 ${reacting === key ? "bg-zinc-100 dark:bg-zinc-800" : ""} ${hasReacted ? "bg-zinc-200 ring-1 ring-zinc-400 dark:bg-zinc-700 text-zinc-900 dark:text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title={label}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {post.reactions[key]}
                  </span>
                </button>
              );
            })}
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
                  disabled={submitting || !commentContent.trim()}
                  className="absolute right-2 bottom-2 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      {post.imageUrl && previewImage && createPortal(
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center select-none"
          style={{ cursor: imgScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
          onClick={(e) => {
            if (!isDragging) closePreview();
          }}
          onMouseMove={(e) => {
            if (isDragging && imgScale > 1) {
              setImgPos({
                x: posAtDragStart.x + (e.clientX - dragStart.x) / imgScale,
                y: posAtDragStart.y + (e.clientY - dragStart.y) / imgScale,
              });
            }
          }}
          onMouseUp={() => {
            if (isDragging) setIsDragging(false);
          }}
        >
          <img
            src={post.imageUrl}
            alt={post.description || "帖子图片"}
            className="max-w-[95vw] max-h-[90vh] rounded-2xl object-contain transition-transform duration-150"
            style={{
              transform: `scale(${imgScale}) translate(${imgPos.x}px, ${imgPos.y}px)`,
              pointerEvents: imgScale > 1 ? 'none' : 'auto',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (imgScale <= 1) closePreview();
            }}
            onMouseDown={(e) => {
              if (imgScale > 1) {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                setPosAtDragStart({ ...imgPos });
              }
            }}
            draggable={false}
          />
        </div>,
        document.body
      )}
    </div>
  );
});
