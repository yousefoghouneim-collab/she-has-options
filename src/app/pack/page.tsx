"use client";

import { useState } from "react";
import ItemGrid from "@/components/ItemGrid";
import type { WardrobeItem } from "@/lib/types";

type DayPlan = { day: number; items: WardrobeItem[] };
type Weather = { location: string; tempC: number; condition: string; emoji: string } | null;

export default function PackPage() {
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ days: DayPlan[]; packItems: WardrobeItem[]; warnings: string[]; weather: Weather } | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't build a packing list");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">Trip Prep</p>
      <h1 className="font-display text-4xl text-ink">Packing List</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Tell me the trip length and I&apos;ll pull a capsule from your wardrobe — reusing shoes sensibly, and factoring
        in today&apos;s weather.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Trip length (days)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="input w-24"
          />
        </label>
        <button onClick={generate} disabled={loading} className="btn-primary clip-corner-sm">
          {loading ? "Packing…" : "Build Packing List"}
        </button>
        {result?.weather && (
          <span className="border border-ink bg-paper px-4 py-2 text-sm">
            {result.weather.emoji} {result.weather.location} · {Math.round(result.weather.tempC)}°C
          </span>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-crimson">{error}</p>}

      {result && (
        <div className="mt-8 space-y-8">
          {result.warnings.length > 0 && (
            <div className="border border-crimson bg-crimson-soft/40 p-4 text-sm text-crimson-dark">
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          <div>
            <p className="eyebrow mb-3">Pack These Items</p>
            <ItemGrid items={result.packItems} emptyMessage="Nothing to pack yet — add some wardrobe items first." />
          </div>

          <div>
            <p className="eyebrow mb-3">Day by Day</p>
            <div className="space-y-4">
              {result.days.map((d) => (
                <div key={d.day} className="border border-ink bg-paper p-4">
                  <p className="mb-3 font-display text-xl text-ink">Day {d.day}</p>
                  {d.items.length > 0 ? (
                    <ItemGrid items={d.items} />
                  ) : (
                    <p className="text-sm text-ink-soft">Couldn&apos;t build an outfit for this day — add more items.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
