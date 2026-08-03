"use client";

import { useEffect, useState } from "react";
import ItemGrid from "@/components/ItemGrid";
import type { WardrobeItem } from "@/lib/types";

type Result = { matches: boolean; reason: string; source: "ai" | "local" };

export default function MatchPage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [selected, setSelected] = useState<WardrobeItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then(setItems);
  }, []);

  function toggle(item: WardrobeItem) {
    setResult(null);
    setSelected((prev) => (prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]));
  }

  async function check() {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selected.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't check these items");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">The Verdict</p>
      <h1 className="font-display text-4xl text-ink">Does This Match?</h1>
      <p className="mt-1 text-sm text-ink-soft">Select two or more items to check if they work well together.</p>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={check} disabled={selected.length < 2 || checking} className="btn-primary clip-corner-sm">
          {checking ? "Checking…" : "Does this match?"}
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => {
              setSelected([]);
              setResult(null);
            }}
            className="btn-secondary clip-corner-sm"
          >
            Clear ({selected.length})
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-crimson">{error}</p>}

      {result && (
        <div className={`mt-6 border p-5 ${result.matches ? "border-ink bg-paper" : "border-crimson bg-crimson-soft/40"}`}>
          <p className="font-display text-2xl text-ink">{result.matches ? "Yes, this works ✓" : "Not quite a match"}</p>
          <p className="mt-1 text-sm text-ink-soft">{result.reason}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-ink-soft">
            {result.source === "ai" ? "Checked by Claude" : "Checked locally"}
          </p>
        </div>
      )}

      <p className="eyebrow mb-4 mt-10">Your Wardrobe</p>
      <ItemGrid items={items} selectedIds={new Set(selected.map((i) => i.id))} onSelect={toggle} />
    </div>
  );
}
