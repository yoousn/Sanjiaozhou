import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readPosts } from "./communityStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ACTIVITY_FILE = path.join(__dirname, "../../scripts", "community_activity.json");

export type CommunityActivity = {
  id: string;
  postId: string;
  uploader: string;
  action: string;
  time: string;
};

function readActivities(): CommunityActivity[] {
  if (!fs.existsSync(ACTIVITY_FILE)) {
    // 迁移：如果文件不存在，从现有 posts 派生并保存
    const posts = readPosts();
    const derived = posts.map((post) => ({
      id: `act_${post.id}`,
      postId: post.id,
      uploader: post.uploader,
      action: `分享了新帖子${post.description ? `："${post.description.slice(0, 30)}"` : ""}`,
      time: post.createdAt,
    }));
    writeActivities(derived);
    return derived;
  }
  try {
    return JSON.parse(fs.readFileSync(ACTIVITY_FILE, "utf-8") || "[]");
  } catch {
    return [];
  }
}

function writeActivities(activities: CommunityActivity[]) {
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2), "utf-8");
}

export function getRecentActivity(limit = 20): CommunityActivity[] {
  const activities = readActivities();
  return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, limit);
}

export function addActivity(data: { postId: string; uploader: string; action: string }) {
  const activities = readActivities();
  const newActivity: CommunityActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...data,
    time: new Date().toISOString(),
  };
  activities.unshift(newActivity);
  // 只保留最近 100 条
  writeActivities(activities.slice(0, 100));
}
