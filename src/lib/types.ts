export type WardrobeItem = {
  id: string;
  imageUrl: string;
  originalImageUrl: string;
  category: string;
  subcategory: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  season: string[];
  formality: number | null;
  material: string | null;
  brand: string | null;
  notes: string | null;
  aiTagged: boolean;
  aiConfidence: number | null;
  favorite: boolean;
  status: string;
  needsWash: boolean;
  wearCount: number;
  lastWorn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedOutfit = {
  id: string;
  name: string | null;
  occasion: string | null;
  aiGenerated: boolean;
  aiReasoning: string | null;
  favorite: boolean;
  createdAt: string;
  items: WardrobeItem[];
};
