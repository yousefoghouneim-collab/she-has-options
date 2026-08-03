"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, SEASONS } from "@/lib/taxonomy";
import type { WardrobeItem } from "@/lib/types";

type ReviewItem = WardrobeItem & { saved: "idle" | "saving" | "saved"; segmentationNote?: string | null };

export default function AddItemPage() {
  const [uploading, setUploading] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extractGarment, setExtractGarment] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("photos", f));
      if (extractGarment) formData.append("extractGarment", "true");
      const res = await fetch("/api/items", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload failed");
      const created: ReviewItem[] = await res.json();
      setReviewItems((prev) => [...created.map((c) => ({ ...c, saved: "idle" as const })), ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong uploading your photo.");
    } finally {
      setUploading(false);
    }
  }

  function updateField<K extends keyof WardrobeItem>(id: string, field: K, value: WardrobeItem[K]) {
    setReviewItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value, saved: "idle" } : it)));
  }

  function toggleSeason(id: string, s: string) {
    setReviewItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, season: it.season.includes(s) ? it.season.filter((x) => x !== s) : [...it.season, s], saved: "idle" }
          : it
      )
    );
  }

  async function saveItem(item: ReviewItem) {
    setReviewItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, saved: "saving" } : it)));
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: item.category,
        subcategory: item.subcategory,
        primaryColor: item.primaryColor,
        secondaryColor: item.secondaryColor,
        pattern: item.pattern,
        season: item.season,
        formality: item.formality,
        material: item.material,
        brand: item.brand,
      }),
    });
    setReviewItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, saved: "saved" } : it)));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="eyebrow">New Piece</p>
      <h1 className="font-display text-4xl text-ink">Add an Item</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload a photo and Claude will suggest the category, color, season, and formality. Review and adjust anything before it&apos;s saved.
      </p>

      {process.env.NEXT_PUBLIC_GARMENT_EXTRACTION_AVAILABLE === "true" && (
        <label className="mt-5 flex max-w-md cursor-pointer items-start gap-3 border border-line bg-paper p-3 text-sm">
          <input
            type="checkbox"
            checked={extractGarment}
            onChange={(e) => setExtractGarment(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-crimson"
          />
          <span>
            <span className="font-semibold text-ink">Extract garment only</span>
            <span className="block text-xs text-ink-soft">
              For photos of you wearing the item — cuts out just the clothing, no body or background. Adds a few
              seconds per photo (one-time model download on first use).
            </span>
          </span>
        </label>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-16 text-center transition ${
          dragOver ? "border-crimson bg-crimson-soft/40" : "border-line bg-paper"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="font-display text-xl text-ink">
          {uploading ? "Uploading & tagging…" : "Drop photos here, or click to choose"}
        </p>
        <p className="text-sm text-ink-soft">You can select more than one at a time.</p>
      </div>

      {error && <p className="mt-4 text-sm text-crimson">{error}</p>}

      {reviewItems.length > 0 && (
        <div className="mt-10 space-y-6">
          <h2 className="font-display text-2xl text-ink">Review new items</h2>
          {reviewItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-5 border border-ink bg-paper p-5 sm:flex-row">
              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden bg-ecru-dim sm:h-56 sm:w-56">
                <Image src={item.imageUrl} alt="" fill className="object-cover" />
              </div>
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Category">
                  <select
                    value={item.category}
                    onChange={(e) => updateField(item.id, "category", e.target.value)}
                    className="input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Subcategory">
                  <input
                    value={item.subcategory ?? ""}
                    onChange={(e) => updateField(item.id, "subcategory", e.target.value)}
                    className="input"
                    placeholder="e.g. Oxford shirt"
                  />
                </Field>
                <Field label="Primary color">
                  <input
                    value={item.primaryColor ?? ""}
                    onChange={(e) => updateField(item.id, "primaryColor", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Secondary color">
                  <input
                    value={item.secondaryColor ?? ""}
                    onChange={(e) => updateField(item.id, "secondaryColor", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Pattern">
                  <input
                    value={item.pattern ?? ""}
                    onChange={(e) => updateField(item.id, "pattern", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Material">
                  <input
                    value={item.material ?? ""}
                    onChange={(e) => updateField(item.id, "material", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Brand">
                  <input
                    value={item.brand ?? ""}
                    onChange={(e) => updateField(item.id, "brand", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Formality (1-5)">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={item.formality ?? ""}
                    onChange={(e) => updateField(item.id, "formality", e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  />
                </Field>
                <div className="col-span-2 sm:col-span-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Season</p>
                  <div className="flex flex-wrap gap-2">
                    {SEASONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSeason(item.id, s)}
                        className={`border px-3 py-1 text-xs uppercase tracking-wide transition ${
                          item.season.includes(s)
                            ? "border-crimson bg-crimson-soft text-crimson-dark"
                            : "border-line text-ink-soft"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
                  <button onClick={() => saveItem(item)} className="btn-primary clip-corner-sm">
                    {item.saved === "saving" ? "Saving…" : item.saved === "saved" ? "Saved ✓" : "Save changes"}
                  </button>
                  {!item.aiTagged && (
                    <span className="text-xs text-ink-soft">AI tagging unavailable — fields left blank, fill in manually.</span>
                  )}
                  {item.aiTagged && item.aiConfidence !== null && item.aiConfidence < 0.5 && (
                    <span className="text-xs text-ink-soft">Low-confidence AI guess — please double-check.</span>
                  )}
                  {item.segmentationNote && <span className="text-xs text-crimson">{item.segmentationNote}</span>}
                </div>
              </div>
            </div>
          ))}
          <Link href="/" className="btn-secondary clip-corner-sm inline-flex">
            Done — view wardrobe
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
