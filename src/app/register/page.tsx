"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create account");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-10">
      <p className="eyebrow">New Here</p>
      <h1 className="font-display text-4xl text-ink">Create Account</h1>
      <p className="mt-1 text-sm text-ink-soft">Just a username and password — your own private wardrobe.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" autoFocus />
          <span className="mt-1 block text-xs text-ink-soft">2-24 characters: letters, numbers, - or _</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <span className="mt-1 block text-xs text-ink-soft">At least 4 characters</span>
        </label>
        {error && <p className="text-sm text-crimson">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary clip-corner-sm w-full justify-center">
          {submitting ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
