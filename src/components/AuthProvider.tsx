"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthUser = { username: string } | null;

const AuthContext = createContext<{
  user: AuthUser;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    setUser(res.ok ? await res.json() : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (res) => {
      if (cancelled) return;
      setUser(res.ok ? await res.json() : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.has(pathname);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [loading, user, pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  const isPublic = PUBLIC_PATHS.has(pathname);
  const ready = !loading && (user || isPublic);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {ready ? children : <div className="min-h-[60vh]" />}
    </AuthContext.Provider>
  );
}
