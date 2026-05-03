import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommunityPost, CommunityReactions, CommunityComment } from "../types";

export function useCommunity() {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"new" | "hot">("new");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts = [], isLoading: loading, error: queryError, refetch: fetchPosts } = useQuery({
    queryKey: ['community_posts', sort, activeTag],
    queryFn: async () => {
      const params = new URLSearchParams({ sort });
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/community/posts?${params.toString()}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("服务端响应异常，请稍后重试");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "加载失败");
      return Array.isArray(data?.data) ? data.data : [] as CommunityPost[];
    },
    refetchInterval: 10000,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['community_activity'],
    queryFn: async () => {
      const res = await fetch("/api/community/activity");
      const data = await res.json();
      return Array.isArray(data?.data) ? data.data : [];
    },
    refetchInterval: 15000,
  });

  const error = queryError instanceof Error ? queryError.message : null;
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post: CommunityPost) => [post.description, post.uploader, ...(post.tags || [])].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [posts, searchQuery]);

  const addReaction = async (postId: string, emoji: keyof CommunityReactions, userId?: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ emoji, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "互动失败");
      
      // 乐观更新或失效查询
      queryClient.setQueryData(['community_posts', sort, activeTag], (prev: any) =>
        prev.map((p: any) => p.id === postId ? { ...p, ...data.data } : p)
      );
      queryClient.invalidateQueries({ queryKey: ['community_activity'] });
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
      
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      queryClient.invalidateQueries({ queryKey: ['community_activity'] });
    } catch (e) {
      throw e;
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`);
      const data = await res.json();
      if (res.ok) {
        queryClient.setQueryData(['community_posts', sort, activeTag], (prev: any) => 
          prev.map((p: any) => p.id === postId ? { ...p, comments: data } : p)
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

      await fetchComments(postId);
      queryClient.invalidateQueries({ queryKey: ['community_activity'] });
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
      await fetchComments(postId);
      queryClient.invalidateQueries({ queryKey: ['community_activity'] });
    } catch (e) {
      throw e;
    }
  };

  return {
    posts: filteredPosts,
    rawPosts: posts,
    activity,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    activeTag,
    setActiveTag,
    loading,
    error,
    fetchPosts,
    addReaction,
    fetchActivity: () => queryClient.invalidateQueries({ queryKey: ['community_activity'] }),
    deletePost,
    fetchComments,
    addComment,
    deleteComment,
  };
}

