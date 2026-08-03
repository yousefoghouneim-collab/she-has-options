"use client";

import Image from "next/image";
import type { WardrobeItem } from "@/lib/types";

export default function ItemCard({
  item,
  selected = false,
  onClick,
  onToggleFavorite,
  footer,
  dimmed = false,
}: {
  item: WardrobeItem;
  selected?: boolean;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  footer?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative border bg-paper transition ${
        selected ? "border-crimson hard-shadow-sm" : "border-ink"
      } ${onClick ? "cursor-pointer hover:hard-shadow-sm" : ""} ${dimmed ? "opacity-50" : ""}`}
    >
      <div className="relative aspect-square w-full bg-ecru-dim">
        <Image
          src={item.imageUrl}
          alt={item.subcategory || item.category}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
        />
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border border-ink bg-paper/95 text-sm"
            aria-label={item.favorite ? "Remove favorite" : "Mark favorite"}
          >
            {item.favorite ? "★" : "☆"}
          </button>
        )}
        {selected && (
          <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center bg-crimson text-sm text-ecru">✓</div>
        )}
      </div>
      <div className="border-t border-ink p-3">
        <p className="truncate text-sm font-semibold text-ink">{item.subcategory || item.category}</p>
        <p className="truncate text-xs uppercase tracking-wide text-ink-soft">
          {[item.primaryColor, item.category].filter(Boolean).join(" · ")}
        </p>
        {footer}
      </div>
    </div>
  );
}
