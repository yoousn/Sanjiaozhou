import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CloudUpload, Loader2, Play, RefreshCw, Trash2, Video } from "lucide-react";
import { cn } from "../utils";

type ToastType = "success" | "warn" | "error";

type GodspotVideo = {
  id: string;
  displayName: string;
  mapName: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  videoKey: string;
  videoUrl: string;
  storageType: "local" | "cloudflare";
  uploader: string;
  createdAt: string;
};

const MAPS = ["全部", "零号🚌", "长工戏骨", "巴克什", "航天基地", "抄袭监狱"];

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function readJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error("服务端响应异常，请稍后重试");
  return res.json();
}

export function GodSpotPage({ auth, onOpenAuth, showToast }: { auth: any; onOpenAuth: () => void; showToast: (msg: string, type?: ToastType) => void }) {
  const [videos, setVideos] = useState<GodspotVideo[]>([]);
  const [activeMap, setActiveMap] = useState("全部");
  const [displayName, setDisplayName] = useState("");
  const [mapName, setMapName] = useState("零号🚌");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredVideos = useMemo(() => {
    if (activeMap === "全部") return videos;
    return videos.filter((video) => video.mapName === activeMap);
  }, [videos, activeMap]);

  const previewVideo = useMemo(() => videos.find((video) => video.id === previewId) || filteredVideos[0] || null, [videos, filteredVideos, previewId]);

  const fetchVideos = async (map = activeMap) => {
    try {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams();
      if (map !== "全部") params.set("mapName", map);
      const res = await fetch(`/api/godspot/videos?${params.toString()}`, { credentials: "same-origin" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "加载失败");
      setVideos(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVideos(activeMap);
  }, [activeMap]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth.isAuthenticated) {
      showToast("请先登录后再上传", "warn");
      onOpenAuth();
      return;
    }
    if (!selectedFile) {
      showToast("请先选择视频文件", "warn");
      return;
    }

    try {
      setUploading(true);
      const form = new FormData();
      form.append("video", selectedFile);
      form.append("displayName", displayName.trim() || selectedFile.name.replace(/\.[^.]+$/, ""));
      form.append("mapName", mapName);

      const res = await fetch("/api/godspot/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "上传失败");

      showToast("视频上传成功", "success");
      setDisplayName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchVideos(activeMap);
      if (data?.data?.id) setPreviewId(data.data.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "上传失败", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (video: GodspotVideo) => {
    if (!auth.isAuthenticated) {
      showToast("请先登录", "warn");
      onOpenAuth();
      return;
    }
    if (!window.confirm(`确认删除「${video.displayName}」吗？`)) return;

    try {
      const res = await fetch(`/api/godspot/videos/${encodeURIComponent(video.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "删除失败");
      showToast("视频已删除", "success");
      if (previewId === video.id) setPreviewId(null);
      await fetchVideos(activeMap);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "删除失败", "error");
    }
  };

  return (
    <motion.div className="mt-4 relative min-h-[calc(100vh-100px)]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
            <Video size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">神人点位</h2>
            <p className="text-[13px] text-zinc-500">上传已压缩好的点位视频，按地图快速筛选预览</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-4">
          <form onSubmit={handleUpload} className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-[15px] font-black text-zinc-900 dark:text-white mb-1">上传视频</h3>
              <p className="text-[12px] text-zinc-500">请先在本地压缩，再上传 MP4/WebM/MOV/MKV/AVI。</p>
            </div>

            <label className="block">
              <span className="text-[12px] font-bold text-zinc-500 mb-2 block">视频名称</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：巴克什二楼窗口点位"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-bold text-zinc-500 mb-2 block">关联地图</span>
              <select
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:text-white"
              >
                {MAPS.filter((item) => item !== "全部").map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
              <CloudUpload size={28} className="text-zinc-400" />
              <div className="text-center">
                <p className="text-[13px] font-black text-zinc-800 dark:text-zinc-100">{selectedFile ? selectedFile.name : "选择视频文件"}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{selectedFile ? formatSize(selectedFile.size) : "最大大小由服务端配置控制，默认 500MB"}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 text-[13px] font-black hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              {uploading ? "正在上传/处理中..." : "上传视频"}
            </button>
          </form>

          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-black text-zinc-900 dark:text-white">快速预览</span>
              <button onClick={() => void fetchVideos(activeMap)} className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" title="刷新">
                <RefreshCw size={14} />
              </button>
            </div>
            {previewVideo ? (
              <video key={previewVideo.id} src={previewVideo.videoUrl} controls preload="metadata" className="w-full aspect-video rounded-2xl bg-black object-contain" />
            ) : (
              <div className="aspect-video rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[12px] font-bold text-zinc-400">暂无可预览视频</div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {MAPS.map((item) => (
              <button
                key={item}
                onClick={() => setActiveMap(item)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-2xl text-[13px] font-black border transition active:scale-95",
                  activeMap === item
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                    : "bg-white dark:bg-[#121214] text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {loading && videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-zinc-400 mb-4" />
              <p className="text-[13px] font-bold text-zinc-500">正在加载视频...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24">
              <AlertCircle size={24} className="text-zinc-400 mb-4" />
              <p className="text-[13px] font-bold text-zinc-500 mb-4">{error}</p>
              <button onClick={() => void fetchVideos(activeMap)} className="px-4 py-2 bg-zinc-900 text-white text-[12px] font-bold rounded-xl hover:bg-zinc-800 transition">重试</button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 py-24 text-center">
              <Video size={28} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-[13px] font-black text-zinc-500">当前地图暂无视频</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <motion.div key={video.id} className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] overflow-hidden shadow-sm hover:shadow-md transition" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <button onClick={() => setPreviewId(video.id)} className="relative w-full aspect-video bg-black group block text-left">
                    <video src={video.videoUrl} preload="metadata" muted className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/5 transition">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-lg">
                        <Play size={20} fill="currentColor" />
                      </div>
                    </div>
                  </button>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-black text-zinc-900 dark:text-white truncate" title={video.displayName}>{video.displayName}</h3>
                        <p className="text-[11px] font-bold text-zinc-500 mt-1">{video.mapName} · {formatSize(video.size)}</p>
                      </div>
                      <button onClick={() => void handleDelete(video)} className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition" title="删除">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                      <span>{video.storageType === "cloudflare" ? "云端" : "本地"}</span>
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
