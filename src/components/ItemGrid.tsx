"use client";

import type { WardrobeItem } from "@/lib/types";
import ItemCard from "@/components/ItemCard";

export default function ItemGrid({
  items,
  selectedIds,
  onSelect,
  onToggleFavorite,
  emptyMessage = "No items yet.",
  renderFooter,
  dimmedIds,
}: {
  items: WardrobeItem[];
  selectedIds?: Set<string>;
  onSelect?: (item: WardrobeItem) => void;
  onToggleFavorite?: (item: WardrobeItem) => void;
  emptyMessage?: string;
  renderFooter?: (item: WardrobeItem) => React.ReactNode;
  dimmedIds?: Set<string>;
}) {
  if (!items.length) {
    return <p className="py-16 text-center text-sm text-ink-soft">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          selected={selectedIds?.has(item.id)}
          onClick={onSelect ? () => onSelect(item) : undefined}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(item) : undefined}
          footer={renderFooter?.(item)}
          dimmed={dimmedIds?.has(item.id)}
        />
      ))}
    </div>
  );
}
