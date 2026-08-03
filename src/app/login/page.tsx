"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't sign in");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-10">
      <p className="eyebrow">Welcome back</p>
      <h1 className="font-display text-4xl text-ink">Sign In</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {error && <p className="text-sm text-crimson">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary clip-corner-sm w-full justify-center">
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        No account yet?{" "}
        <Link href="/register" className="font-semibold text-ink underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
