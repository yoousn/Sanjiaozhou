import React, { useState, useRef, useEffect } from "react";
import { X, Image, Clipboard, Loader2, Trash2 } from "lucide-react";
import { cn } from "../../utils";
import { useClipboardImage } from "../../hooks/useClipboardImage";

const TAG_OPTIONS = ["满改", "跑刀", "大金", "白给", "修脚", "高配", "性价比", "赌桥"];

export function CommunityComposer({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploader, setUploader] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clipboard = useClipboardImage();

  const hasImage = Boolean(clipboard.previewUrl);

  // 1.4 Ctrl+V 粘贴识别
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            clipboard.setFilePreview(file);
            setError(null);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [clipboard]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      clipboard.setFilePreview(file);
      setError(null);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePost = async () => {
    // 1.4 允许无图片发帖，但至少要有描述
    if (!hasImage && !description.trim()) {
      setError("图片或内容至少填写一项");
      return;
    }
    setError(null);
    setPosting(true);

    try {
      // Step 1: Upload image from preview
      let imageUrl = "";
      if (clipboard.previewUrl) {
        setUploading(true);
        const blob = await fetch(clipboard.previewUrl).then((r) => r.blob());
        const formData = new FormData();
        formData.append("file", blob, "upload.png");
        const uploadRes = await fetch("/api/community/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData?.error || "图片上传失败");
        imageUrl = uploadData.url;
      }

      // Step 2: Create post
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          description,
          tags,
          uploader: uploader || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "发布失败");

      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setUploading(false);
      setPosting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 mb-6 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-black text-zinc-900 dark:text-white">发布帖子/图片</h3>
        <button
          onClick={onClose}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Image area */}
      <div className="mb-5">
        {hasImage ? (
          <div className="relative inline-block">
            <img
              src={clipboard.previewUrl!}
              alt="预览"
              className="max-h-48 rounded-2xl border border-zinc-200 dark:border-zinc-800 object-cover"
            />
            <button
              onClick={clipboard.clearPreview}
              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow"
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[13px] font-bold text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 transition bg-white dark:bg-[#18181b]"
              >
                <Image size={16} strokeWidth={2} />
                选择本地图片
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => clipboard.readClipboard()}
                  disabled={clipboard.reading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[13px] font-bold text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 transition bg-white dark:bg-[#18181b] disabled:opacity-60"
                >
                  {clipboard.reading ? (
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Clipboard size={16} strokeWidth={2} />
                  )}
                  {clipboard.reading ? "读取中..." : "读取剪切板图片"}
                </button>
                <span className="text-[11px] text-zinc-400 font-medium">Ctrl+v可识别图片</span>
              </div>
            </div>
          </div>
        )}
        {clipboard.error && (
          <p className="text-[12px] font-bold text-red-500 mt-2">{clipboard.error}</p>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="说说这个配置..."
          rows={3}
          className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-2xl p-3 text-[13px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-zinc-900/10 resize-none"
        />
        <span className="text-[11px] text-zinc-400 font-bold mt-1 block text-right">
          {description.length}/500
        </span>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-[12px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
          标签
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[12px] font-bold transition border",
                tags.includes(tag)
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                  : "bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Uploader */}
      <div className="mb-5">
        <input
          type="text"
          value={uploader}
          onChange={(e) => setUploader(e.target.value.slice(0, 50))}
          placeholder="你的昵称 (可选)"
          className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-zinc-900/10"
        />
      </div>

      {error && (
        <p className="text-[12px] font-bold text-red-500 mb-4">{error}</p>
      )}

      <button
        onClick={() => void handlePost()}
        disabled={posting || uploading || (!hasImage && !description.trim())}
        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[13px] hover:opacity-90 transition disabled:opacity-50"
      >
        {uploading ? "上传图片中..." : posting ? "发布中..." : "发布帖子/图片"}
      </button>
    </div>
  );
}
