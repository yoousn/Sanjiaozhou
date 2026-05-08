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
  storageType: "local" | "cloudflare" | "external";
  sourceType: "upload" | "bilibili" | "douyin";
  sourceUrl?: string;
  bvid?: string;
  coverUrl?: string;
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
  const [externalUrl, setExternalUrl] = useState("");
  const [resolvingExternal, setResolvingExternal] = useState(false);
  const [mapName, setMapName] = useState("零号🚌");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"upload" | "external">("upload");
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

  const handleResolveExternal = async () => {
    const url = externalUrl.trim();
    if (!url) {
      showToast("请先粘贴视频链接", "warn");
      return;
    }
    if (!auth.isAuthenticated) {
      showToast("请先登录后再识别链接", "warn");
      onOpenAuth();
      return;
    }

    try {
      setResolvingExternal(true);
      const res = await fetch("/api/godspot/resolve-external", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "识别失败");
      const title = String(data?.data?.title || "").trim();
      if (!title) throw new Error("未识别到视频标题，请手动填写");
      if (!displayName.trim()) setDisplayName(title);
      showToast(displayName.trim() ? "已识别标题，可按需替换当前标题" : "已自动填写视频标题", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "识别失败，请手动填写标题", "warn");
    } finally {
      setResolvingExternal(false);
    }
  };


  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleSaveExternal = async () => {
    if (!auth.isAuthenticated) {
      showToast("请先登录后再保存", "warn");
      onOpenAuth();
      return;
    }
    const url = externalUrl.trim();
    if (!url) {
      showToast("请先粘贴视频链接", "warn");
      return;
    }

    try {
      setSavingExternal(true);
      const res = await fetch("/api/godspot/save-external", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, displayName: displayName.trim() || undefined, mapName }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.error || "保存失败");

      showToast("外链视频已保存", "success");
      setDisplayName("");
      setExternalUrl("");
      await fetchVideos(activeMap);
      if (data?.data?.id) setPreviewId(data.data.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setSavingExternal(false);
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

      <div className="grid grid-cols-1 2xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        <form onSubmit={uploadMode === "upload" ? handleUpload : (e) => { e.preventDefault(); void handleSaveExternal(); }} className="rounded-[2rem] border border-white/70 dark:border-zinc-800 bg-white/80 dark:bg-[#121214]/90 p-4 shadow-sm backdrop-blur-xl space-y-3 2xl:sticky 2xl:top-4">
          <div>
            <h3 className="text-[14px] font-black text-zinc-900 dark:text-white mb-1">上传视频</h3>
            <p className="text-[11px] text-zinc-500">压缩后上传，支持 MP4/WebM/MOV/MKV/AVI。</p>
          </div>

          <div className="flex gap-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setUploadMode("upload")}
              className={cn(
                "flex-1 py-2 rounded-xl text-[12px] font-black transition",
                uploadMode === "upload"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >本地上传</button>
            <button
              type="button"
              onClick={() => setUploadMode("external")}
              className={cn(
                "flex-1 py-2 rounded-xl text-[12px] font-black transition",
                uploadMode === "external"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >B站/抖音外链</button>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-zinc-500 mb-1.5 block">视频名称</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：巴克什二楼窗口"
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 px-3.5 py-2.5 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-zinc-500 mb-1.5 block">关联地图</span>
            <select
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 px-3.5 py-2.5 text-[12px] font-bold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:text-white"
            >
              {MAPS.filter((item) => item !== "全部").map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          {uploadMode === "upload" ? (
            <>
              <label className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                  <CloudUpload size={20} className="text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-zinc-800 dark:text-zinc-100 truncate">{selectedFile ? selectedFile.name : "选择视频文件"}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{selectedFile ? formatSize(selectedFile.size) : "默认最大 500MB"}</p>
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
                className="w-full rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2.5 text-[12px] font-black hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                {uploading ? "上传/处理中..." : "上传视频"}
              </button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-[11px] font-bold text-zinc-500 mb-1.5 block">视频链接（B站 / 抖音）</span>
                <div className="flex gap-2">
                  <input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    onBlur={() => { if (externalUrl.trim() && !displayName.trim()) void handleResolveExternal(); }}
                    placeholder="粘贴 B站 / 抖音视频链接"
                    className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 px-3.5 py-2.5 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleResolveExternal()}
                    disabled={resolvingExternal}
                    className="shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-900 px-3 text-[11px] font-black text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-60 transition"
                  >
                    {resolvingExternal ? <Loader2 size={13} className="animate-spin" /> : "识别"}
                  </button>
                </div>
              </label>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3">
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80 font-medium">
                  该模式不会下载视频，只保存链接。B 站用官方播放器嵌入，抖音展示封面并跳转观看。
                </p>
              </div>

              <button
                type="submit"
                disabled={savingExternal}
                className="w-full rounded-2xl bg-sky-600 dark:bg-sky-500 text-white py-2.5 text-[12px] font-black hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {savingExternal ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {savingExternal ? "保存中..." : "保存视频"}
              </button>
            </>
          )}
        </form>

        <div className="min-w-0 space-y-5">
          <div className="rounded-[2rem] border border-white/70 dark:border-zinc-800 bg-white/80 dark:bg-[#121214]/90 p-4 md:p-5 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {MAPS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setActiveMap(item)}
                    className={cn(
                      "shrink-0 px-4 py-2 rounded-2xl text-[13px] font-black border transition active:scale-95",
                      activeMap === item
                        ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-sm"
                        : "bg-white/70 dark:bg-zinc-900/70 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button onClick={() => void fetchVideos(activeMap)} className="self-start lg:self-auto px-3 py-2 rounded-2xl text-[12px] font-black text-zinc-500 bg-zinc-100/80 dark:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-2" title="刷新">
                <RefreshCw size={14} />
                刷新
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] bg-black shadow-2xl shadow-zinc-900/10">
              {previewVideo ? (
                previewVideo.sourceType === "bilibili" && previewVideo.bvid ? (
                  <div className="relative w-full aspect-[16/9] max-h-[62vh] bg-black">
                    <iframe
                      src={`https://player.bilibili.com/player.html?bvid=${previewVideo.bvid}&page=1&autoplay=0&high_quality=1`}
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      className="w-full h-full bg-black"
                      style={{ pointerEvents: "auto" }}
                    />
                    <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10">
                      <a
                        href={previewVideo.sourceUrl || `https://www.bilibili.com/video/${previewVideo.bvid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-[12px] font-black hover:bg-white/35 transition shadow-lg"
                      >打开原视频</a>
                    </div>
                  </div>
                ) : previewVideo.sourceType === "douyin" ? (
                  <div className="relative w-full aspect-[16/9] max-h-[62vh] bg-zinc-950 flex items-center justify-center">
                    {previewVideo.coverUrl ? (
                      <img src={previewVideo.coverUrl} alt={previewVideo.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Play size={48} className="text-zinc-600" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <a
                        href={previewVideo.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 rounded-full bg-white/20 backdrop-blur text-white text-[14px] font-black hover:bg-white/35 transition shadow-lg"
                      >打开抖音观看</a>
                    </div>
                  </div>
                ) : (
                  <video key={previewVideo.id} src={previewVideo.videoUrl} controls preload="metadata" className="w-full aspect-[16/9] max-h-[62vh] bg-black object-contain" />
                )
              ) : (
                <div className="aspect-[16/9] min-h-[320px] bg-zinc-950 flex items-center justify-center text-[13px] font-bold text-zinc-500">暂无可预览视频</div>
              )}
              {previewVideo && (
                <div className="pointer-events-none absolute left-0 right-0 top-0 p-4 bg-gradient-to-b from-black/65 to-transparent">
                  <div className="flex flex-wrap items-center gap-2 text-white">
                    <span className="px-3 py-1 rounded-full bg-white/18 backdrop-blur text-[12px] font-black">{previewVideo.mapName}</span>
                    {previewVideo.sourceType === "bilibili" && (
                      <span className="px-3 py-1 rounded-full bg-sky-500/60 backdrop-blur text-[11px] font-black">B站</span>
                    )}
                    {previewVideo.sourceType === "douyin" && (
                      <span className="px-3 py-1 rounded-full bg-pink-500/60 backdrop-blur text-[11px] font-black">抖音</span>
                    )}
                    <span className="text-[14px] md:text-[16px] font-black drop-shadow">{previewVideo.displayName}</span>
                    {previewVideo.sourceType === "upload" && (
                      <span className="text-[11px] font-bold text-white/70">{formatSize(previewVideo.size)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 py-24 text-center bg-white/50 dark:bg-[#121214]/70">
              <Video size={28} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-[13px] font-black text-zinc-500">当前地图暂无视频</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVideos.map((video) => {
                const active = previewVideo?.id === video.id;
                return (
                  <motion.div key={video.id} className={cn("rounded-[1.5rem] border bg-white/85 dark:bg-[#121214]/90 overflow-hidden shadow-sm hover:shadow-lg transition backdrop-blur-xl", active ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/10" : "border-white/70 dark:border-zinc-800")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <button onClick={() => setPreviewId(video.id)} className="relative w-full aspect-video bg-black group block text-left">
                      {video.sourceType === "bilibili" || video.sourceType === "douyin" ? (
                        video.coverUrl ? (
                          <img src={video.coverUrl} alt={video.displayName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <Play size={32} className="text-zinc-600" />
                          </div>
                        )
                      ) : (
                        <video src={video.videoUrl} preload="metadata" muted className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/5 transition">
                        <div className="w-11 h-11 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition">
                          <Play size={18} fill="currentColor" />
                        </div>
                      </div>
                      {active && <span className="absolute left-3 top-3 px-2.5 py-1 rounded-full bg-white text-zinc-900 text-[10px] font-black shadow-sm">预览中</span>}
                      {video.sourceType === "bilibili" && (
                        <span className="absolute right-3 top-3 px-2.5 py-1 rounded-full bg-sky-600/80 text-white text-[10px] font-black shadow-sm">B站外链</span>
                      )}
                      {video.sourceType === "douyin" && (
                        <span className="absolute right-3 top-3 px-2.5 py-1 rounded-full bg-pink-500/80 text-white text-[10px] font-black shadow-sm">抖音</span>
                      )}
                    </button>
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-black text-zinc-900 dark:text-white truncate" title={video.displayName}>{video.displayName}</h3>
                          <p className="text-[11px] font-bold text-zinc-500 mt-1">{video.mapName}{video.sourceType === "upload" ? ` · ${formatSize(video.size)}` : ""}</p>
                        </div>
                        <button onClick={() => void handleDelete(video)} className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                        <span>{video.sourceType === "bilibili" ? "B站外链" : video.sourceType === "douyin" ? "抖音" : video.storageType === "cloudflare" ? "云端" : "本地"}</span>
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
