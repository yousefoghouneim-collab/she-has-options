import { outfitColorScore, colorPairScore } from "@/lib/colors";

// Deterministic, no-AI outfit logic. Used as the fallback whenever the
// Claude call fails, is unavailable, or the wardrobe is too small for a
// good AI suggestion — so outfit suggestions and the match checker never
// just break. Mirrors the "AI-first, but never AI-only" pattern from the
// reference audit (OutfitOs-main).

export type ItemForMatching = {
  id: string;
  category: string;
  subcategory?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  formality?: number | null;
  favorite: boolean;
  season?: string[];
};

export type WeatherBias = { isHot: boolean; isVeryHot: boolean };

const COMPLETE_CATEGORIES = new Set(["Dress"]);
const ACCESSORY_CATEGORIES = new Set(["Accessory", "Headwear", "Jewelry", "Bag"]);
// Categories that can only fill one "slot" in a real outfit — picking two of
// the same one (e.g. shorts + sweatpants, both "Bottom") isn't a style
// clash, it's structurally not an outfit at all.
const SINGLE_SLOT_CATEGORIES = new Set(["Dress", "Top", "Bottom", "Shoes", "Outerwear"]);

/**
 * Catches combinations no human would call "an outfit" regardless of colour
 * harmony: two of the same single-slot category (two bottoms, two tops,
 * two pairs of shoes...), or a dress paired with a separate top/bottom that
 * would double up the same body area a dress already covers.
 */
export function structuralIssue(items: ItemForMatching[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!SINGLE_SLOT_CATEGORIES.has(item.category)) continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  for (const [category, count] of counts) {
    if (count > 1) {
      return category === "Dress"
        ? "You've picked more than one dress — try one at a time with separates."
        : `You've picked more than one ${category.toLowerCase()} (e.g. two ${category === "Bottom" ? "pairs of shorts/pants" : "items for the same slot"}) — an outfit only has room for one.`;
    }
  }
  if ((counts.get("Dress") ?? 0) > 0 && ((counts.get("Top") ?? 0) > 0 || (counts.get("Bottom") ?? 0) > 0)) {
    return "A dress plus a separate top or bottom covers the same part of the body twice — pick one or the other.";
  }
  return null;
}

function pick<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T | undefined {
  if (!items.length) return undefined;
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(items);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Picks one outfit's worth of items from category pools. Shared by both the
 * single-suggestion path and the multi-day packing list — `penalize` lets
 * the packing list discourage repeating the same top/bottom on consecutive
 * days without banning reuse outright (small wardrobes need repeats).
 */
function pickOutfitFrom(
  pools: { dresses: ItemForMatching[]; tops: ItemForMatching[]; bottoms: ItemForMatching[]; shoes: ItemForMatching[]; outerwear: ItemForMatching[]; accessories: ItemForMatching[] },
  weather?: WeatherBias,
  penalize?: (item: ItemForMatching) => number
): ItemForMatching[] | null {
  const { dresses, tops, bottoms, shoes, outerwear, accessories } = pools;
  const useDress = dresses.length > 0 && (bottoms.length === 0 || Math.random() < 0.4);

  const picked: ItemForMatching[] = [];
  const scoreAgainstPicked = (candidate: ItemForMatching) => {
    const colorWeight = outfitColorScore([...picked.map((p) => p.primaryColor), candidate.primaryColor]);
    const favoriteBoost = candidate.favorite ? 0.2 : 0;
    const weatherBoost = weather?.isHot && candidate.season?.includes("summer") ? 0.25 : 0;
    const penalty = penalize ? penalize(candidate) : 0;
    return Math.max(0.02, 0.2 + colorWeight * (0.6 + favoriteBoost) + weatherBoost - penalty);
  };

  if (useDress) {
    const dress = weightedPick(dresses, scoreAgainstPicked);
    if (!dress) return null;
    picked.push(dress);
  } else {
    if (!tops.length || !bottoms.length) return null;
    const top = weightedPick(tops, scoreAgainstPicked);
    if (!top) return null;
    picked.push(top);
    const bottom = weightedPick(bottoms, scoreAgainstPicked);
    if (!bottom) return null;
    picked.push(bottom);
  }

  if (shoes.length) {
    const shoe = weightedPick(shoes, scoreAgainstPicked);
    if (shoe) picked.push(shoe);
  }

  if (outerwear.length && Math.random() < 0.5) {
    const jacket = weightedPick(outerwear, scoreAgainstPicked);
    if (jacket) picked.push(jacket);
  }

  if (accessories.length && Math.random() < 0.6) {
    const accessory = weightedPick(accessories, scoreAgainstPicked);
    if (accessory) picked.push(accessory);
  }

  return picked;
}

function poolsFrom(wardrobe: ItemForMatching[], weather?: WeatherBias) {
  return {
    dresses: wardrobe.filter((i) => COMPLETE_CATEGORIES.has(i.category)),
    tops: wardrobe.filter((i) => i.category === "Top"),
    bottoms: wardrobe.filter((i) => i.category === "Bottom"),
    shoes: wardrobe.filter((i) => i.category === "Shoes"),
    // Skip outerwear entirely once it's genuinely hot out (routine for most of the UAE year).
    outerwear: weather?.isVeryHot ? [] : wardrobe.filter((i) => i.category === "Outerwear"),
    accessories: wardrobe.filter((i) => ACCESSORY_CATEGORIES.has(i.category)),
  };
}

/**
 * Builds one outfit from the wardrobe: either a "complete" garment (a
 * dress) or a top+bottom, plus shoes and optionally outerwear/an
 * accessory. Item choices are weighted toward better colour-harmony with
 * whatever's already been picked, and slightly toward favourites.
 */
export function generateLocalOutfit(
  wardrobe: ItemForMatching[],
  weather?: WeatherBias,
  excludeIds?: Set<string>
): { itemIds: string[]; reason: string } | null {
  const candidateWardrobe = excludeIds?.size ? wardrobe.filter((i) => !excludeIds.has(i.id)) : wardrobe;
  let picked = pickOutfitFrom(poolsFrom(candidateWardrobe, weather), weather);
  // A small wardrobe may not have enough alternates to honor the exclusion —
  // better to repeat something than to return nothing.
  if (!picked && candidateWardrobe !== wardrobe) {
    picked = pickOutfitFrom(poolsFrom(wardrobe, weather), weather);
  }
  if (!picked) return null;

  const colorWords = Array.from(new Set(picked.map((p) => p.primaryColor).filter(Boolean)));
  const combo =
    colorWords.length > 1
      ? `A ${colorWords.slice(0, -1).join(", ")} and ${colorWords[colorWords.length - 1]} combination`
      : `A simple, colour-coordinated pick`;
  const weatherNote = weather?.isVeryHot
    ? ", kept light for the heat"
    : weather?.isHot
      ? ", leaning breezy for the warm weather"
      : "";
  const reason = `${combo}${weatherNote}, pulled together locally (no AI call).`;

  return { itemIds: picked.map((p) => p.id), reason };
}

/**
 * Builds a multi-day packing capsule: one outfit per day, reusing a small
 * rotating set of shoes (packing a fresh pair per day isn't realistic),
 * and mildly discouraging repeating the exact same top/bottom on
 * back-to-back days when the wardrobe has enough variety to avoid it.
 */
export function generatePackingList(
  wardrobe: ItemForMatching[],
  days: number,
  weather?: WeatherBias
): { days: { day: number; itemIds: string[] }[]; packItemIds: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const dresses = wardrobe.filter((i) => COMPLETE_CATEGORIES.has(i.category));
  const tops = wardrobe.filter((i) => i.category === "Top");
  const bottoms = wardrobe.filter((i) => i.category === "Bottom");
  const shoesAll = wardrobe.filter((i) => i.category === "Shoes");
  const outerwear = weather?.isVeryHot ? [] : wardrobe.filter((i) => i.category === "Outerwear");
  const accessories = wardrobe.filter((i) => ACCESSORY_CATEGORIES.has(i.category));

  if (!dresses.length && (!tops.length || !bottoms.length)) {
    warnings.push("Not enough tops + bottoms (or dresses) to build outfits — add a few more items.");
  }
  if (!shoesAll.length) warnings.push("No shoes in your wardrobe yet.");

  const shoeCap = Math.max(1, Math.min(shoesAll.length, Math.ceil(days / 3), 3));
  const shoesForTrip = [...shoesAll].sort((a, b) => Number(b.favorite) - Number(a.favorite)).slice(0, shoeCap);

  const lastUsedDay = new Map<string, number>();
  const outDays: { day: number; itemIds: string[] }[] = [];

  for (let d = 0; d < days; d++) {
    const penalize = (item: ItemForMatching) => {
      const last = lastUsedDay.get(item.id);
      if (last === undefined) return 0;
      const gap = d - last;
      return gap <= 1 ? 0.7 : gap === 2 ? 0.3 : 0;
    };
    const picked = pickOutfitFrom({ dresses, tops, bottoms, shoes: shoesForTrip, outerwear, accessories }, weather, penalize);
    if (!picked) {
      outDays.push({ day: d + 1, itemIds: [] });
      continue;
    }
    picked.forEach((p) => lastUsedDay.set(p.id, d));
    outDays.push({ day: d + 1, itemIds: picked.map((p) => p.id) });
  }

  const packItemIds = Array.from(new Set(outDays.flatMap((d) => d.itemIds)));
  return { days: outDays, packItemIds, warnings };
}

export function localMatchCheck(items: ItemForMatching[]): {
  matches: boolean;
  score: number;
  reason: string;
} {
  const colorScore = outfitColorScore(items.map((i) => i.primaryColor));
  const formalities = items.map((i) => i.formality).filter((f): f is number => typeof f === "number");
  const formalitySpread = formalities.length > 1 ? Math.max(...formalities) - Math.min(...formalities) : 0;
  const structuralProblem = structuralIssue(items);

  const matches = colorScore >= 0.62 && formalitySpread <= 2 && !structuralProblem;

  let reason: string;
  if (structuralProblem) {
    reason = structuralProblem;
  } else if (formalitySpread > 2) {
    reason = "These items sit at quite different formality levels, so they may feel mismatched together.";
  } else if (colorScore >= 0.75) {
    reason = "Strong colour harmony — these work well together.";
  } else if (colorScore >= 0.62) {
    reason = "The colours are compatible, if not a perfect match.";
  } else {
    reason = "The colours pull in different directions and may clash.";
  }

  return { matches, score: Number(colorScore.toFixed(2)), reason };
}

export { colorPairScore };
