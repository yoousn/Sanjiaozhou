import { useState, useCallback, useRef, useEffect } from "react";

export function useClipboardImage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return revoke;
  }, [revoke]);

  const readClipboard = useCallback(async () => {
    setError(null);
    setReading(true);
    try {
      if (!navigator.clipboard?.read) {
        throw new Error("当前浏览器不支持读取剪切板");
      }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            revoke();
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setPreviewUrl(url);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        throw new Error("当前剪切板中没有图片");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "读取剪切板失败";
      setError(msg);
    } finally {
      setReading(false);
    }
  }, [revoke]);

  const clearPreview = useCallback(() => {
    revoke();
    setPreviewUrl(null);
    setError(null);
  }, [revoke]);

  const setFilePreview = useCallback(
    (file: File) => {
      setError(null);
      revoke();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    },
    [revoke]
  );

  return {
    previewUrl,
    error,
    reading,
    readClipboard,
    clearPreview,
    setFilePreview,
  };
}
