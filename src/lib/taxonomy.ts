export const CATEGORIES = [
  "Top",
  "Bottom",
  "Dress",
  "Outerwear",
  "Shoes",
  "Bag",
  "Accessory",
  "Headwear",
  "Jewelry",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const FORMALITY_LABELS: Record<number, string> = {
  1: "Very casual",
  2: "Casual",
  3: "Smart casual",
  4: "Formal",
  5: "Very formal",
};

// Slot each category maps to when auto-composing an outfit locally.
export const OUTFIT_SLOTS = {
  complete: ["Dress"], // a single item that fills top+bottom on its own
  top: ["Top"],
  bottom: ["Bottom"],
  outerwear: ["Outerwear"],
  shoes: ["Shoes"],
  bag: ["Bag"],
  accessory: ["Accessory", "Headwear", "Jewelry"],
} as const;
