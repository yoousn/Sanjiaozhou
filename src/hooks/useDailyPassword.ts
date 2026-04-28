import { useState, useRef, useEffect, useCallback } from 'react';
import { safeJson } from '../utils/collect';

export function useDailyPassword(showToast: (msg: string, type?: 'success' | 'warn' | 'error') => void) {
  const [dailyPwd, setDailyPwd] = useState<{ date: string; data: Record<string, string> } | null>(null);
  const [dailyPwdLogs, setDailyPwdLogs] = useState<Array<{ time: string; message: string; success: boolean }>>([]);
  const [isRefreshingDailyPwd, setIsRefreshingDailyPwd] = useState(false);
  const [copiedDailyPwdKey, setCopiedDailyPwdKey] = useState<string | null>(null);

  const dailyPwdCopyTimerRef = useRef<number | null>(null);
  const dailyPwdPollTimerRef = useRef<number | null>(null);
  const dailyPwdDateWatcherRef = useRef<number | null>(null);
  const dailyPwdRequestInFlightRef = useRef(false);
  const dailyPwdLatestRef = useRef<{ date: string; data: Record<string, string> } | null>(null);
  const currentBeijingDayRef = useRef(new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }));

  const hasGarbledDailyPwd = (data: Record<string, string>) => Object.keys(data).some(key => key.includes(''));
  const getBeijingToday = () => new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const isDailyPwdForToday = useCallback((payload: { date: string; data: Record<string, string> } | null | undefined) => {
    if (!payload?.date) return false;
    return payload.date === getBeijingToday();
  }, []);

  const applyDailyPwd = useCallback((data: Record<string, string> | { date: string; data: Record<string, string> } | null | undefined) => {
    if (data && 'date' in data && 'data' in data && data.data && typeof data.data === 'object') {
      const nextDailyPwd = data as { date: string; data: Record<string, string> };
      dailyPwdLatestRef.current = nextDailyPwd;
      setDailyPwd(nextDailyPwd);
      return true;
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data as Record<string, string>).length > 0 && !('error' in data)) {
      const today = getBeijingToday();
      const nextDailyPwd = { date: today, data: data as Record<string, string> };
      dailyPwdLatestRef.current = nextDailyPwd;
      setDailyPwd(nextDailyPwd);
      return true;
    }
    return false;
  }, []);

  const shouldRefreshDailyPwd = useCallback((data: Record<string, string> | { date: string; data: Record<string, string> } | null | undefined) => {
    if (data && 'date' in data && 'data' in data && typeof (data as { data: Record<string, string> }).data === 'object' && !Array.isArray((data as { data: Record<string, string> }).data)) {
      const typed = data as { date: string; data: Record<string, string> };
      return typed.date !== getBeijingToday() || hasGarbledDailyPwd(typed.data);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && !('error' in data)) {
      return hasGarbledDailyPwd(data as Record<string, string>);
    }
    return true;
  }, []);

  const fetchDailyPwdLogs = useCallback(() => {
    fetch('/api/daily-password/logs')
      .then(safeJson)
      .then(data => setDailyPwdLogs(Array.isArray(data?.logs) ? data.logs : []))
      .catch(console.error);
  }, []);

  const stopDailyPwdPolling = useCallback(() => {
    if (dailyPwdPollTimerRef.current !== null) {
      window.clearTimeout(dailyPwdPollTimerRef.current);
      dailyPwdPollTimerRef.current = null;
    }
  }, []);

  const syncDailyPwd = useCallback(async ({ forceRefreshToday = false }: { forceRefreshToday?: boolean } = {}) => {
    if (dailyPwdRequestInFlightRef.current) return;
    dailyPwdRequestInFlightRef.current = true;

    try {
      const res = await fetch('/api/daily-password');
      const data = await safeJson(res);
      const applied = res.ok && applyDailyPwd(data);
      const needsRefresh = forceRefreshToday || !applied || shouldRefreshDailyPwd(data);

      if (!needsRefresh) {
        stopDailyPwdPolling();
        return;
      }

      const refreshRes = await fetch('/api/daily-password/refresh', { method: 'POST' });
      const refreshData = await safeJson(refreshRes);
      if (refreshRes.ok) {
        const payload = refreshData.data ?? refreshData;
        const refreshApplied = applyDailyPwd(payload);
        if (refreshApplied && isDailyPwdForToday(dailyPwdLatestRef.current)) {
          stopDailyPwdPolling();
          fetchDailyPwdLogs();
          return;
        }
      }

      // Schedule polling if still not refreshed
      stopDailyPwdPolling();
      dailyPwdPollTimerRef.current = window.setTimeout(() => {
        dailyPwdPollTimerRef.current = null;
        void syncDailyPwd({ forceRefreshToday: true });
      }, 2 * 60 * 1000);
      
      fetchDailyPwdLogs();
    } catch (error) {
      console.error(error);
      stopDailyPwdPolling();
      dailyPwdPollTimerRef.current = window.setTimeout(() => {
        dailyPwdPollTimerRef.current = null;
        void syncDailyPwd({ forceRefreshToday: true });
      }, 2 * 60 * 1000);
    } finally {
      dailyPwdRequestInFlightRef.current = false;
    }
  }, [applyDailyPwd, shouldRefreshDailyPwd, isDailyPwdForToday, fetchDailyPwdLogs, stopDailyPwdPolling]);

  const handleRefreshDailyPwd = async () => {
    if (isRefreshingDailyPwd) return;
    setIsRefreshingDailyPwd(true);
    try {
      const res = await fetch('/api/daily-password/refresh', { method: 'POST' });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '获取每日密码失败');
      applyDailyPwd(data?.data ?? data);
      stopDailyPwdPolling();
      fetchDailyPwdLogs();
      showToast('每日密码已更新');
    } catch (error) {
      console.error('手动获取每日密码失败:', error);
      fetchDailyPwdLogs();
      showToast(error instanceof Error ? error.message : '获取每日密码失败', 'warn');
    } finally {
      setIsRefreshingDailyPwd(false);
    }
  };

  const handleCopyDailyPwd = async (mapName: string, pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      if (dailyPwdCopyTimerRef.current !== null) {
        window.clearTimeout(dailyPwdCopyTimerRef.current);
      }
      setCopiedDailyPwdKey(mapName);
      dailyPwdCopyTimerRef.current = window.setTimeout(() => {
        setCopiedDailyPwdKey((prev) => (prev === mapName ? null : prev));
        dailyPwdCopyTimerRef.current = null;
      }, 500);
      showToast(`${mapName} 密码已复制`);
    } catch (error) {
      console.error('复制密码失败:', error);
      showToast('复制失败，请手动复制', 'warn');
    }
  };

  useEffect(() => {
    void syncDailyPwd();
    
    const checkDailyPwdDateChange = () => {
      const today = getBeijingToday();
      if (today !== currentBeijingDayRef.current) {
        currentBeijingDayRef.current = today;
        void syncDailyPwd({ forceRefreshToday: true });
      }
    };

    dailyPwdDateWatcherRef.current = window.setInterval(checkDailyPwdDateChange, 60 * 1000);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        checkDailyPwdDateChange();
        if (!isDailyPwdForToday(dailyPwdLatestRef.current) || shouldRefreshDailyPwd(dailyPwdLatestRef.current)) {
          void syncDailyPwd({ forceRefreshToday: true });
        }
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      if (dailyPwdDateWatcherRef.current !== null) {
        window.clearInterval(dailyPwdDateWatcherRef.current);
        dailyPwdDateWatcherRef.current = null;
      }
      stopDailyPwdPolling();
      if (dailyPwdCopyTimerRef.current !== null) {
        window.clearTimeout(dailyPwdCopyTimerRef.current);
      }
    };
  }, [syncDailyPwd, isDailyPwdForToday, shouldRefreshDailyPwd, stopDailyPwdPolling]);

  return {
    dailyPwd,
    dailyPwdLogs,
    isRefreshingDailyPwd,
    copiedDailyPwdKey,
    handleRefreshDailyPwd,
    handleCopyDailyPwd,
    fetchDailyPwdLogs,
    syncDailyPwd,
  };
}
