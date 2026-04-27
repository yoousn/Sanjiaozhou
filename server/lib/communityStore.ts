import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMUNITY_POSTS_FILE = path.join(__dirname, "..", "..", "scripts", "community_posts.json");

type CommunityReactions = {
  fire: number;
  money: number;
  skull: number;
};

export type CommunityPost = {
  id: string;
  imageUrl: string;
  description: string;
  tags: string[];
  createdAt: string;
  uploader: string;
  reactions: CommunityReactions;
  reactionTotal: number;
};

function normalizePost(raw: Partial<CommunityPost>): CommunityPost {
  const reactions: CommunityReactions = {
    fire: Math.max(0, Number(raw.reactions?.fire) || 0),
    money: Math.max(0, Number(raw.reactions?.money) || 0),
    skull: Math.max(0, Number(raw.reactions?.skull) || 0),
  };
  return {
    id: String(raw.id || ""),
    imageUrl: String(raw.imageUrl || "").trim(),
    description: String(raw.description || "").trim().slice(0, 500),
    tags: Array.isArray(raw.tags)
      ? [...new Set(raw.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 10)
      : [],
    createdAt: String(raw.createdAt || new Date().toISOString()),
    uploader: String(raw.uploader || "匿名").trim().slice(0, 50),
    reactions,
    reactionTotal: reactions.fire + reactions.money + reactions.skull,
  };
}

export function readPosts(): CommunityPost[] {
  if (!fs.existsSync(COMMUNITY_POSTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(COMMUNITY_POSTS_FILE, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizePost) : [];
  } catch {
    return [];
  }
}

export function writePosts(posts: CommunityPost[]) {
  const dir = path.dirname(COMMUNITY_POSTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(COMMUNITY_POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
}

export function createPost(data: {
  imageUrl: string;
  description: string;
  tags: string[];
  uploader: string;
}): CommunityPost {
  const posts = readPosts();
  const post: CommunityPost = normalizePost({
    id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
    reactions: { fire: 0, money: 0, skull: 0 },
  });
  posts.unshift(post);
  writePosts(posts);
  return post;
}

export function addReaction(postId: string, emoji: keyof CommunityReactions): CommunityPost | null {
  const posts = readPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index === -1) return null;

  const post = posts[index];
  const newReactions = { ...post.reactions, [emoji]: post.reactions[emoji] + 1 };
  const updated: CommunityPost = {
    ...post,
    reactions: newReactions,
    reactionTotal: newReactions.fire + newReactions.money + newReactions.skull,
  };
  posts[index] = updated;
  writePosts(posts);
  return updated;
}

export function queryPosts(sort: "new" | "hot", tag?: string): CommunityPost[] {
  let posts = readPosts();
  if (tag) {
    const normalizedTag = tag.trim().toLowerCase();
    posts = posts.filter((p) => p.tags.some((t) => t.toLowerCase() === normalizedTag));
  }
  if (sort === "hot") {
    return posts.sort((a, b) => b.reactionTotal - a.reactionTotal || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
