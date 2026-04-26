import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'warn' | 'error';

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ msg, type });
    timeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}