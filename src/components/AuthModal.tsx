import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { overlayFade, scaleIn } from './motionPresets';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (u: string, p: string) => Promise<any>;
  onRegister: (u: string, p: string) => Promise<any>;
  showToast?: (msg: string, type?: 'success' | 'warn' | 'error') => void;
};

export function AuthModal({ isOpen, onClose, onLogin, onRegister, showToast }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // 打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await onRegister(username, password);
      } else {
        await onLogin(username, password);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      setError(msg);
      showToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="auth-modal" className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-4" onWheel={(event) => event.stopPropagation()}>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white dark:bg-[#121214] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">
                {isRegister ? '加入社区' : '欢迎回来'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-[14px] font-bold focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition"
                  placeholder="输入用户名"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-[14px] font-bold focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition"
                  placeholder="输入密码"
                />
              </div>

              {error && <p className="text-[12px] text-red-500 font-bold ml-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isRegister ? '注册并登录' : '立即登录'}
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setError(null); }}
                  className="text-[13px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  {isRegister ? '已有账号？去登录' : '还没有账号？去注册'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
