import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{ id: number; msg: string; type: 'success' | 'warn' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'warn' = 'success') => {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}