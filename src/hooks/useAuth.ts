import { useState, useCallback, useEffect } from "react";

export type AuthUser = {
  id: string;
  username: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("auth_user");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // 检查是否过期 (6个月 = 180天)
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem("auth_user");
        return null;
      }
      return parsed.user;
    } catch {
      return null;
    }
  });

  const saveAuth = (userData: AuthUser) => {
    const expiry = Date.now() + 180 * 24 * 60 * 60 * 1000; // 6个月
    localStorage.setItem("auth_user", JSON.stringify({ user: userData, expiry }));
    setUser(userData);
  };

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "登录失败");
    
    saveAuth(data.data);
    return data.data;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "注册失败");
    
    saveAuth(data.data);
    return data.data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("auth_user");
  }, []);

  return {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
