import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writeJsonAtomic } from "./atomicJson.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMENTS_FILE = path.join(__dirname, "../../scripts", "community_comments.json");

export type Comment = {
  id: string;
  postId: string;
  content: string;
  author: string;
  createdAt: string;
};

export function readComments(): Comment[] {
  if (!fs.existsSync(COMMENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8") || "[]");
  } catch {
    return [];
  }
}

export function writeComments(comments: Comment[]) {
  writeJsonAtomic(COMMENTS_FILE, comments);
}

export function getCommentsByPostId(postId: string): Comment[] {
  return readComments().filter((c) => c.postId === postId);
}

export function getCommentById(id: string): Comment | undefined {
  return readComments().find((c) => c.id === id);
}

export function addComment(postId: string, content: string, author: string): Comment {
  const comments = readComments();
  const newComment: Comment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    postId,
    content,
    author,
    createdAt: new Date().toISOString(),
  };
  comments.push(newComment);
  writeComments(comments);
  return newComment;
}

export function deleteComment(id: string) {
  const comments = readComments().filter((c) => c.id !== id);
  writeComments(comments);
}