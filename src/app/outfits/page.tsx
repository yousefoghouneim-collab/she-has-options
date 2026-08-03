"use client";

import { useEffect, useState } from "react";
import ItemGrid from "@/components/ItemGrid";
import type { SavedOutfit, WardrobeItem } from "@/lib/types";

type Weather = { location: string; tempC: number; condition: string; emoji: string } | null;

export default function OutfitsPage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [staged, setStaged] = useState<WardrobeItem[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "local" | "manual" | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [weather, setWeather] = useState<Weather>(null);
  const [wornOutfitId, setWornOutfitId] = useState<string | null>(null);

  function refreshSavedOutfits() {
    fetch("/api/outfits").then((r) => r.json()).then(setSavedOutfits);
  }

  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then(setItems);
    fetch("/api/weather")
      .then((r) => (r.ok ? r.json() : null))
      .then(setWeather);
    refreshSavedOutfits();
  }, []);

  function toggleStage(item: WardrobeItem) {
    setSource("manual");
    setReasoning(null);
    setStaged((prev) => (prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]));
  }

  async function suggestOutfit(excludeCurrent = false) {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const excludeItemIds = excludeCurrent ? staged.map((i) => i.id) : [];
      const res = await fetch("/api/outfits/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeItemIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't suggest an outfit");
      setStaged(data.items);
      setReasoning(data.reasoning);
      setSource(data.source);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSuggesting(false);
    }
  }

  async function saveOutfit() {
    if (staged.length < 1) return;
    setSaving(true);
    try {
      await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: staged.map((i) => i.id),
          aiGenerated: source === "ai" || source === "local",
          aiReasoning: reasoning,
        }),
      });
      setStaged([]);
      setReasoning(null);
      setSource(null);
      refreshSavedOutfits();
    } finally {
      setSaving(false);
    }
  }

  async function logOutfitWorn(outfitId: string) {
    setWornOutfitId(outfitId);
    await fetch(`/api/outfits/${outfitId}/wear`, { method: "POST" });
    setTimeout(() => setWornOutfitId(null), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Mix It Up</p>
          <h1 className="font-display text-4xl text-ink">Build an Outfit</h1>
          <p className="mt-1 text-sm text-ink-soft">Get an AI suggestion, or click items below to build one yourself.</p>
        </div>
        {weather && (
          <div className="border border-ink bg-paper px-4 py-2 text-sm">
            <span className="font-semibold text-ink">
              {weather.emoji} {weather.location} · {Math.round(weather.tempC)}°C
            </span>
            <span className="ml-2 text-ink-soft">{weather.condition}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={() => suggestOutfit(false)} disabled={suggesting || items.length < 1} className="btn-primary clip-corner-sm">
          {suggesting ? "Thinking…" : "✨ Suggest an Outfit"}
        </button>
        {staged.length > 0 && (source === "ai" || source === "local") && (
          <button
            onClick={() => suggestOutfit(true)}
            disabled={suggesting || items.length < 1}
            className="btn-secondary clip-corner-sm"
          >
            {suggesting ? "Thinking…" : "🔀 Suggest a Different One"}
          </button>
        )}
        {staged.length > 0 && (
          <button
            onClick={() => {
              setStaged([]);
              setReasoning(null);
              setSource(null);
            }}
            className="btn-secondary clip-corner-sm"
          >
            Clear
          </button>
        )}
      </div>
      {suggestError && <p className="mt-3 text-sm text-crimson">{suggestError}</p>}

      <div className="mt-8 border border-ink bg-paper p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Staging Area</p>
          {source && (
            <span className="border border-line px-3 py-1 text-xs uppercase tracking-wide text-ink-soft">
              {source === "ai" ? "Suggested by Claude" : source === "local" ? "Suggested locally" : "Built manually"}
            </span>
          )}
        </div>
        {staged.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">Nothing staged yet — get a suggestion or click items below.</p>
        ) : (
          <>
            <ItemGrid
              items={staged}
              selectedIds={new Set(staged.map((i) => i.id))}
              onSelect={(item) => toggleStage(item)}
            />
            {reasoning && <p className="mt-4 text-sm italic text-ink-soft">&ldquo;{reasoning}&rdquo;</p>}
            <button onClick={saveOutfit} disabled={saving || staged.length < 1} className="btn-primary clip-corner-sm mt-4">
              {saving ? "Saving…" : "Save this Outfit"}
            </button>
          </>
        )}
      </div>

      <p className="eyebrow mb-4 mt-10">Your Wardrobe</p>
      <ItemGrid items={items} selectedIds={new Set(staged.map((i) => i.id))} onSelect={toggleStage} />

      {savedOutfits.length > 0 && (
        <>
          <p className="eyebrow mb-4 mt-12">Saved Outfits</p>
          <div className="space-y-4">
            {savedOutfits.map((outfit) => (
              <div key={outfit.id} className="border border-ink bg-paper p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-ink-soft">{new Date(outfit.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    {outfit.aiGenerated && (
                      <span className="border border-line px-3 py-1 text-xs uppercase tracking-wide text-ink-soft">AI-suggested</span>
                    )}
                    <button onClick={() => logOutfitWorn(outfit.id)} className="btn-secondary clip-corner-sm">
                      {wornOutfitId === outfit.id ? "Logged ✓" : "Wore this today"}
                    </button>
                  </div>
                </div>
                <ItemGrid items={outfit.items} />
                {outfit.aiReasoning && <p className="mt-3 text-sm italic text-ink-soft">&ldquo;{outfit.aiReasoning}&rdquo;</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
