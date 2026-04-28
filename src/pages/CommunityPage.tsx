import React, { useState, useEffect } from "react";
import { useCommunity } from "../hooks/useCommunity";
import { CommunityToolbar } from "../components/community/CommunityToolbar";
import { CommunityComposer } from "../components/community/CommunityComposer";
import { CommunityFeed } from "../components/community/CommunityFeed";
import { CommunityActivityBar } from "../components/community/CommunityActivityBar";
import { Loader2, AlertCircle, ThumbsUp } from "lucide-react";

export function CommunityPage() {
  const community = useCommunity();
  const [showComposer, setShowComposer] = useState(false);
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleLikeClick = (e: React.MouseEvent) => {
    const id = Date.now();
    const x = e.clientX;
    const y = e.clientY;
    setStars((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.id !== id));
    }, 1000);
  };

  return (
    <div className="animate-fade-in mt-4 relative min-h-[calc(100vh-100px)]">
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-black tracking-tighter mb-2 text-zinc-900 dark:text-white">
            社区
          </h2>
          <p className="text-[13px] text-zinc-500 mb-6">
            分享你的改枪配置，看看大家都在玩什么
          </p>

          <CommunityToolbar
            sort={community.sort}
            onSortChange={community.setSort}
            activeTag={community.activeTag}
            onTagChange={community.setActiveTag}
            onOpenComposer={() => setShowComposer(true)}
          />

          {showComposer && (
            <CommunityComposer
              onClose={() => setShowComposer(false)}
              onPosted={() => {
                setShowComposer(false);
                community.fetchPosts();
              }}
            />
          )}

          {community.loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-zinc-400 mb-4" />
              <p className="text-[13px] font-bold text-zinc-500">正在加载...</p>
            </div>
          ) : community.error ? (
            <div className="flex flex-col items-center justify-center py-24">
              <AlertCircle size={24} className="text-zinc-400 mb-4" />
              <p className="text-[13px] font-bold text-zinc-500 mb-4">{community.error}</p>
              <button
                onClick={() => community.fetchPosts()}
                className="px-4 py-2 bg-zinc-900 text-white text-[12px] font-bold rounded-xl hover:bg-zinc-800 transition"
              >
                重试
              </button>
            </div>
          ) : (
            <CommunityFeed
              posts={community.posts}
              onReact={(postId, emoji) => community.addReaction(postId, emoji)}
              onTagClick={(tag) => community.setActiveTag(tag === community.activeTag ? null : tag)}
              onDelete={community.deletePost}
              onFetchComments={community.fetchComments}
              onAddComment={community.addComment}
              onDeleteComment={community.deleteComment}
            />
          )}
        </div>

        <CommunityActivityBar activities={community.activity} />
      </div>

      {/* 1.2 点赞悬浮按钮 */}
      <button
        onClick={handleLikeClick}
        className="fixed bottom-8 right-8 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg shadow-green-500/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-[100]"
        title="给社区点个赞"
      >
        <ThumbsUp size={24} fill="currentColor" />
      </button>

      {/* 飄星动画 */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="fixed pointer-events-none z-[101] animate-star-fly"
          style={{
            left: star.x,
            top: star.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="text-green-500 text-2xl">⭐</span>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes star-fly {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -150px) scale(1.5); opacity: 0; }
        }
        .animate-star-fly {
          animation: star-fly 1s ease-out forwards;
        }
      `}} />
    </div>
  );
}
