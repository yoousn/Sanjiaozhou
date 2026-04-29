import React from "react";
import { CommunityPostCard } from "./CommunityPostCard";
import type { CommunityPost, CommunityReactions } from "../../types";

export function CommunityFeed({
  posts,
  onReact,
  onTagClick,
  onDelete,
  onFetchComments,
  onAddComment,
  onDeleteComment,
  auth,
}: {
  posts: CommunityPost[];
  onReact: (postId: string, emoji: keyof CommunityReactions, userId: string) => void;
  onTagClick: (tag: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onFetchComments?: (postId: string) => Promise<void>;
  onAddComment?: (postId: string, content: string, author: string) => Promise<void>;
  onDeleteComment?: (postId: string, commentId: string) => Promise<void>;
  auth: any;
}) {
  if (posts.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-zinc-400 animate-fade-in">
        <div className="w-16 h-16 bg-white dark:bg-[#18181b] shadow-sm border border-zinc-200/50 rounded-2xl flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
        <p className="font-bold text-xs tracking-widest uppercase text-zinc-500">还没有帖子，来发第一个吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {posts.map((post, idx) => (
        <div
          key={post.id}
          className="animate-fade-in"
          style={{ animationDelay: `${idx * 0.04}s` }}
        >
          <CommunityPostCard
            post={post}
            onReact={onReact}
            onTagClick={onTagClick}
            onDelete={onDelete}
            onFetchComments={onFetchComments}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            auth={auth}
          />
        </div>
      ))}
    </div>
  );
}
