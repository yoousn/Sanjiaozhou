import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Copy, Trash2, ShieldAlert, Users as UsersIcon, KeyRound, Crown, Shield, RefreshCw, Check } from 'lucide-react';
import { cn } from '../utils';

type InviteCode = {
  code: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  usedBy?: string;
  usedAt?: string;
};

type AdminUser = {
  id: string;
  username: string;
  createdAt: string;
  role?: string;
  registerIp?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginUa?: string;
  loginCount?: number;
};

type Props = {
  currentUserId: string;
  showToast?: (message: string, type?: 'success' | 'warn' | 'error') => void;
};

async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json().catch(() => null);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return value;
  }
}

function shortUa(ua?: string): string {
  if (!ua) return '—';
  // 简单提取浏览器 + 系统
  const m = ua.match(/(Edg|Chrome|Firefox|Safari)[\\/\s]+\d+/i);
  const sys = ua.match(/(Windows NT [\d.]+|Mac OS X [\d_.]+|Android [\d.]+|iPhone OS [\d_.]+|Linux)/i);
  const parts: string[] = [];
  if (m) parts.push(m[0]);
  if (sys) parts.push(sys[0].replace(/_/g, '.'));
  return parts.length ? parts.join(' · ') : ua.slice(0, 60);
}

const sectionTitleClass = 'flex items-center gap-2 text-[13px] font-black tracking-tight text-zinc-900 dark:text-white mb-3';
const cardClass = 'bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl';
const tableCellClass = 'px-3 py-2.5 text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 align-middle';
const tableHeadClass = 'px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-50/70 dark:bg-zinc-900/40';
const dangerButtonClass = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors';
const ghostButtonClass = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors';
const primaryButtonClass = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-[12px] font-black shadow-sm hover:opacity-90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black';

export function AdminPanel({ currentUserId, showToast }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteNote, setInviteNote] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users', { credentials: 'same-origin' });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '加载用户失败');
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '加载用户失败', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch('/api/auth/invites', { credentials: 'same-origin' });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '加载邀请码失败');
      setInvites(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '加载邀请码失败', 'error');
    } finally {
      setLoadingInvites(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
    fetchInvites();
  }, [fetchUsers, fetchInvites]);

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const res = await fetch('/api/auth/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ note: inviteNote.trim() || undefined }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '生成失败');
      setInviteNote('');
      showToast?.('邀请码已生成', 'success');
      fetchInvites();
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '生成失败', 'error');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (code: string) => {
    if (!window.confirm(`确认删除邀请码 ${code}？`)) return;
    try {
      const res = await fetch(`/api/auth/invites/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '删除失败');
      showToast?.('邀请码已删除', 'success');
      fetchInvites();
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    } catch {
      showToast?.('复制失败，请手动选择文本', 'warn');
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.id === currentUserId) {
      showToast?.('不能删除自己', 'warn');
      return;
    }
    if (!window.confirm(`确认删除用户 ${user.username}？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '删除失败');
      showToast?.(`已删除用户 ${user.username}`, 'success');
      fetchUsers();
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  const handleToggleRole = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (user.id === currentUserId && nextRole !== 'admin') {
      showToast?.('不能取消自己的管理员权限', 'warn');
      return;
    }
    const verb = nextRole === 'admin' ? '提升为管理员' : '降级为普通用户';
    if (!window.confirm(`确认将 ${user.username} ${verb}？`)) return;
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(user.id)}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || '操作失败');
      showToast?.(`已将 ${user.username} ${verb}`, 'success');
      fetchUsers();
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const unusedInvites = invites.filter((i) => !i.usedBy).length;
    return { total, admins, unusedInvites, invitesTotal: invites.length };
  }, [users, invites]);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3">
          <ShieldAlert size={28} className="text-amber-500" />
          管理面板
        </h2>
        <p className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400 mt-2">
          仅管理员可见。在这里管理账号、邀请码与登录情况。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cn(cardClass, 'p-4')}>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">用户总数</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className={cn(cardClass, 'p-4')}>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">管理员数</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.admins}</div>
        </div>
        <div className={cn(cardClass, 'p-4')}>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">未使用邀请码</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.unusedInvites}</div>
        </div>
        <div className={cn(cardClass, 'p-4')}>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">邀请码总数</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{stats.invitesTotal}</div>
        </div>
      </div>

      {/* 邀请码区 */}
      <section className={cn(cardClass, 'p-5')}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className={sectionTitleClass}>
            <KeyRound size={16} />
            <span>邀请码</span>
          </div>
          <button onClick={fetchInvites} className={ghostButtonClass} title="刷新">
            <RefreshCw size={12} className={loadingInvites ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        <div className="flex items-end gap-2 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">备注（可选）</label>
            <input
              type="text"
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              placeholder="例如：给某朋友"
              maxLength={80}
              className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition"
            />
          </div>
          <button onClick={handleCreateInvite} disabled={creatingInvite} className={primaryButtonClass}>
            {creatingInvite ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            生成邀请码
          </button>
        </div>

        {loadingInvites && invites.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-bold text-zinc-400">
            <Loader2 size={20} className="animate-spin inline mr-2" /> 加载中...
          </div>
        ) : invites.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-bold text-zinc-400">暂无邀请码，先生成一个吧</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={tableHeadClass}>邀请码</th>
                  <th className={tableHeadClass}>备注</th>
                  <th className={tableHeadClass}>创建</th>
                  <th className={tableHeadClass}>状态</th>
                  <th className={cn(tableHeadClass, 'text-right pr-4')}>操作</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const used = Boolean(inv.usedBy);
                  return (
                    <tr key={inv.code} className="border-t border-zinc-100 dark:border-zinc-800/60">
                      <td className={tableCellClass}>
                        <code className={cn('font-mono px-2 py-1 rounded-md text-[11px]', used ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 line-through' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300')}>
                          {inv.code}
                        </code>
                      </td>
                      <td className={tableCellClass}>{inv.note || '—'}</td>
                      <td className={tableCellClass}>
                        <div className="text-[11px]">{formatDate(inv.createdAt)}</div>
                        <div className="text-[10px] font-semibold text-zinc-400">by {inv.createdBy}</div>
                      </td>
                      <td className={tableCellClass}>
                        {used ? (
                          <div>
                            <div className="text-[11px] font-bold text-zinc-500">已被 {inv.usedBy} 使用</div>
                            <div className="text-[10px] text-zinc-400">{formatDate(inv.usedAt)}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            可用
                          </span>
                        )}
                      </td>
                      <td className={cn(tableCellClass, 'text-right whitespace-nowrap pr-3')}>
                        {!used && (
                          <button onClick={() => handleCopyCode(inv.code)} className={ghostButtonClass}>
                            {copiedCode === inv.code ? <Check size={12} /> : <Copy size={12} />}
                            {copiedCode === inv.code ? '已复制' : '复制'}
                          </button>
                        )}
                        <button onClick={() => handleDeleteInvite(inv.code)} className={dangerButtonClass}>
                          <Trash2 size={12} /> 删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 用户区 */}
      <section className={cn(cardClass, 'p-5')}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className={sectionTitleClass}>
            <UsersIcon size={16} />
            <span>用户列表</span>
          </div>
          <button onClick={fetchUsers} className={ghostButtonClass}>
            <RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        {loadingUsers && users.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-bold text-zinc-400">
            <Loader2 size={20} className="animate-spin inline mr-2" /> 加载中...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-bold text-zinc-400">暂无用户</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={tableHeadClass}>用户</th>
                  <th className={tableHeadClass}>注册</th>
                  <th className={tableHeadClass}>最近登录</th>
                  <th className={tableHeadClass}>登录次数</th>
                  <th className={cn(tableHeadClass, 'text-right pr-4')}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === currentUserId;
                  const isAdmin = u.role === 'admin';
                  return (
                    <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800/60">
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0', isAdmin ? 'bg-amber-500 text-white' : 'bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900')}>
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-[12px] text-zinc-900 dark:text-white truncate flex items-center gap-1">
                              {u.username}
                              {isMe && <span className="text-[9px] font-black bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">你</span>}
                            </div>
                            <div className={cn('inline-flex items-center gap-1 text-[10px] font-bold mt-0.5', isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400')}>
                              {isAdmin ? <Crown size={10} /> : <Shield size={10} />}
                              {isAdmin ? '管理员' : '普通用户'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        <div className="text-[11px]">{formatDate(u.createdAt)}</div>
                        <div className="text-[10px] font-semibold text-zinc-400">{u.registerIp || '—'}</div>
                      </td>
                      <td className={tableCellClass}>
                        <div className="text-[11px]">{formatDate(u.lastLoginAt)}</div>
                        <div className="text-[10px] font-semibold text-zinc-400">{u.lastLoginIp || '—'}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[260px]" title={u.lastLoginUa}>{shortUa(u.lastLoginUa)}</div>
                      </td>
                      <td className={tableCellClass}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {u.loginCount || 0}
                        </span>
                      </td>
                      <td className={cn(tableCellClass, 'text-right whitespace-nowrap pr-3')}>
                        <button onClick={() => handleToggleRole(u)} className={ghostButtonClass} disabled={isMe && isAdmin}>
                          {isAdmin ? <Shield size={12} /> : <Crown size={12} />}
                          {isAdmin ? '降级' : '设为管理员'}
                        </button>
                        <button onClick={() => handleDeleteUser(u)} className={dangerButtonClass} disabled={isMe}>
                          <Trash2 size={12} /> 删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminPanel;
