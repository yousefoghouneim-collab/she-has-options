type PrismaItem = {
  id: string;
  imagePath: string;
  displayPath: string;
  category: string;
  subcategory: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  season: string;
  formality: number | null;
  material: string | null;
  brand: string | null;
  notes: string | null;
  aiTagged: boolean;
  aiConfidence: number | null;
  favorite: boolean;
  status: string;
  needsWash: boolean;
  createdAt: Date;
  updatedAt: Date;
  wearLogs?: { wornAt: Date }[];
  _count?: { wearLogs: number };
};

// Blob-stored photos are saved as full URLs; local-disk ones as relative
// paths served through /api/photos/[...path].
function toImageUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ? pathOrUrl : `/api/photos/${pathOrUrl}`;
}

export function serializeItem(item: PrismaItem) {
  let season: string[] = [];
  try {
    season = JSON.parse(item.season);
  } catch {
    season = [];
  }
  return {
    id: item.id,
    imageUrl: toImageUrl(item.displayPath),
    originalImageUrl: toImageUrl(item.imagePath),
    category: item.category,
    subcategory: item.subcategory,
    primaryColor: item.primaryColor,
    secondaryColor: item.secondaryColor,
    pattern: item.pattern,
    season,
    formality: item.formality,
    material: item.material,
    brand: item.brand,
    notes: item.notes,
    aiTagged: item.aiTagged,
    aiConfidence: item.aiConfidence,
    favorite: item.favorite,
    status: item.status,
    needsWash: item.needsWash,
    wearCount: item._count?.wearLogs ?? 0,
    lastWorn: item.wearLogs?.[0]?.wornAt ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
