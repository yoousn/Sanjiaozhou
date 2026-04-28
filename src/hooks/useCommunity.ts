import { useState, useCallback, useEffect } from "react";
import type { CommunityPost, CommunityReactions, CommunityComment } from "../types";

export function useCommunity() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; postId: string; uploader: string; action: string; time: string }>>([]);
  const [sort, setSort] = useState<"new" | "hot">("new");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/community/posts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "加载失败");
      setPosts(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [sort, activeTag]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/community/activity");
      const data = await res.json();
      if (res.ok) {
        setActivity(Array.isArray(data?.data) ? data.data : []);
      }
    } catch {
      // activity is non-critical
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchActivity();
  }, [fetchPosts]);

  const addReaction = async (postId: string, emoji: keyof CommunityReactions) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "互动失败");
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...data.data, reactionTotal: data.data.reactionTotal } : p))
      );
    } catch (e) {
      throw e;
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "删除失败");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      fetchActivity();
    } catch (e) {
      throw e;
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`);
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: data } : p))
        );
      }
    } catch {
      // silent fail
    }
  };

  const addComment = async (postId: string, content: string, author: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "发表评论失败");
      
      // 重新获取该帖子的评论以更新列表
      await fetchComments(postId);
    } catch (e) {
      throw e;
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "删除评论失败");
      }
      // 重新获取评论以更新
      await fetchComments(postId);
    } catch (e) {
      throw e;
    }
  };

  return {
    posts,
    activity,
    sort,
    setSort,
    activeTag,
    setActiveTag,
    loading,
    error,
    fetchPosts,
    addReaction,
    fetchActivity,
    deletePost,
    fetchComments,
    addComment,
    deleteComment,
  };
}
