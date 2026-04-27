import { readPosts } from "./communityStore.js";

export type CommunityActivity = {
  id: string;
  postId: string;
  uploader: string;
  action: string;
  time: string;
};

export function getRecentActivity(limit = 20): CommunityActivity[] {
  const posts = readPosts();
  return posts.slice(0, limit).map((post) => ({
    id: `act_${post.id}`,
    postId: post.id,
    uploader: post.uploader,
    action: `分享了新配置${post.description ? `："${post.description.slice(0, 30)}"` : ""}`,
    time: post.createdAt,
  }));
}
