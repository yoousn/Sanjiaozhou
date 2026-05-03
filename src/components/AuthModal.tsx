import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils';
import { overlayFade, scaleIn } from './motionPresets';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (u: string, p: string) => Promise<any>;
  onRegister: (u: string, p: string) => Promise<any>;
};

export function AuthModal({ isOpen, onClose, onLogin, onRegister }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-4 overscroll-contain" onWheel={(event) => event.stopPropagation()}>
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="exit"
        />
        <motion.div
          className="bg-white dark:bg-[#121214] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
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
              onClick={() => setIsRegister(!isRegister)}
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
