"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ItemGrid from "@/components/ItemGrid";
import { CATEGORIES, SEASONS } from "@/lib/taxonomy";
import type { WardrobeItem } from "@/lib/types";

const REDISCOVER_DAYS = 30;

export default function GalleryPage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [season, setSeason] = useState<string>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  async function toggleFavorite(item: WardrobeItem) {
    const next = !item.favorite;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: next } : i)));
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
  }

  async function toggleWash(item: WardrobeItem) {
    const next = !item.needsWash;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, needsWash: next } : i)));
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsWash: next }),
    });
  }

  async function logWear(item: WardrobeItem) {
    const res = await fetch(`/api/items/${item.id}/wear`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  async function deleteItem(item: WardrobeItem) {
    const label = item.subcategory || item.category;
    if (!window.confirm(`Delete "${label}" from your wardrobe? This can't be undone.`)) return;
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (season !== "all" && !item.season.includes(season)) return false;
      if (favoriteOnly && !item.favorite) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [item.category, item.subcategory, item.primaryColor, item.brand]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, category, season, favoriteOnly, search]);

  const [now] = useState(() => Date.now());

  const rediscover = useMemo(() => {
    return items
      .filter((i) => !i.lastWorn || now - new Date(i.lastWorn).getTime() >= REDISCOVER_DAYS * 86400000)
      .sort((a, b) => (a.lastWorn ? new Date(a.lastWorn).getTime() : 0) - (b.lastWorn ? new Date(b.lastWorn).getTime() : 0))
      .slice(0, 6);
  }, [items, now]);

  const wearFooter = (item: WardrobeItem) => (
    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
      <span>{item.wearCount === 0 ? "Never worn" : `Worn ${item.wearCount}×`}</span>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            logWear(item);
          }}
          className="underline decoration-dotted hover:text-ink"
        >
          Wear
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWash(item);
          }}
          className={`underline decoration-dotted hover:text-ink ${item.needsWash ? "text-crimson" : ""}`}
        >
          {item.needsWash ? "Dirty" : "Clean"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(item);
          }}
          className="underline decoration-dotted hover:text-crimson"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="font-display text-4xl leading-tight text-ink">Your Options</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"} catalogued`}
          </p>
        </div>
        <Link href="/add" className="btn-primary clip-corner-sm">
          + Add Item
        </Link>
      </div>

      {!loading && rediscover.length > 0 && (
        <div className="mb-10 border border-ink bg-paper p-4">
          <p className="eyebrow mb-3">Rediscover</p>
          <ItemGrid items={rediscover} renderFooter={wearFooter} />
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-[10rem]"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input max-w-[9rem]">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className="input max-w-[8rem]">
            <option value="all">All seasons</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFavoriteOnly((v) => !v)}
            className={`border px-4 py-2 text-sm transition ${
              favoriteOnly ? "border-crimson bg-crimson-soft text-crimson-dark" : "border-line bg-paper text-ink-soft"
            }`}
          >
            ★ Favorites
          </button>
        </div>
      )}

      {!loading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-dashed border-ink py-24 text-center">
          <p className="font-display text-2xl text-ink">Your closet is empty</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Add a photo of a clothing item and Claude will tag its category, color, and season for you automatically.
          </p>
          <Link href="/add" className="btn-primary clip-corner-sm">
            Add your first item
          </Link>
        </div>
      ) : (
        <ItemGrid
          items={filtered}
          onToggleFavorite={toggleFavorite}
          renderFooter={wearFooter}
          dimmedIds={new Set(items.filter((i) => i.needsWash).map((i) => i.id))}
          emptyMessage="No items match these filters."
        />
      )}
    </div>
  );
}
