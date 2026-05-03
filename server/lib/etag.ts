import fs from "fs";
import type { Request, Response, NextFunction } from "express";

export function fileMtime(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

export function etagFromMtime(mtime: number | null, suffix = ""): string {
  const base = mtime != null ? String(Math.floor(mtime)) : "0";
  return `"${base}${suffix ? "-" + suffix : ""}"`;
}

export function setFileETag(filePath: string, suffix: string | ((req: Request) => string) = "") {
  return (req: Request, res: Response, next: NextFunction) => {
    const mtime = fileMtime(filePath);
    const suffixStr = typeof suffix === "function" ? suffix(req) : suffix;
    const etag = etagFromMtime(mtime, suffixStr);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader("ETag", etag);
    if (mtime != null) {
      res.setHeader("Last-Modified", new Date(mtime).toUTCString());
    }
    res.setHeader("Cache-Control", "no-cache");
    next();
  };
}
