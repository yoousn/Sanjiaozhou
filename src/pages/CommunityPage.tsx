import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCommunity } from "../hooks/useCommunity";
import { CommunityToolbar } from "../components/community/CommunityToolbar";
import { CommunityComposer } from "../components/community/CommunityComposer";
import { CommunityFeed } from "../components/community/CommunityFeed";
import { CommunityActivityBar } from "../components/community/CommunityActivityBar";
import { Loader2, AlertCircle } from "lucide-react";

export function CommunityPage({ auth, onOpenAuth, showToast }: { auth: any, onOpenAuth: () => void, showToast: (msg: string, type?: 'success' | 'warn' | 'error') => void }) {
  const community = useCommunity();
  const [showComposer, setShowComposer] = useState(false);

  return (
    <motion.div className="mt-4 relative min-h-[calc(100vh-100px)]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex flex-col lg:flex-row gap-6">
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
            searchQuery={community.searchQuery}
            onSearchChange={community.setSearchQuery}
            onOpenComposer={() => setShowComposer(true)}
          />

          {showComposer && (
            <CommunityComposer
              onClose={() => setShowComposer(false)}
              onPosted={() => {
                setShowComposer(false);
                community.fetchPosts();
                showToast('发帖成功！');
              }}
              uploaderName={auth.isAuthenticated ? auth.user.username : ""}
              showToast={showToast}
            />
          )}

          {community.loading && community.posts.length === 0 ? (
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
              onReact={(postId, emoji, userId) => community.addReaction(postId, emoji, userId)}
              onTagClick={(tag) => community.setActiveTag(tag === community.activeTag ? null : tag)}
              onDelete={community.deletePost}
              onFetchComments={community.fetchComments}
              onAddComment={community.addComment}
              onDeleteComment={community.deleteComment}
              auth={auth}
              showToast={showToast}
            />
          )}
        </div>

        <CommunityActivityBar activities={community.activity} />
      </div>
    </motion.div>
  );
}
