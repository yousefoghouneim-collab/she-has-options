// Lightweight colour-harmony scoring used as the no-AI fallback for outfit
// suggestions and the "does this match" checker. Neutrals pair with
// anything; same-group colours pair well; opposite warm/cool groups still
// work, just score lower. No external calls, no ML — pure lookup + rules.

type ColorGroup = "neutral" | "warm" | "cool";

const COLOR_GROUPS: Record<string, ColorGroup> = {
  black: "neutral",
  white: "neutral",
  ivory: "neutral",
  cream: "neutral",
  beige: "neutral",
  tan: "neutral",
  brown: "neutral",
  grey: "neutral",
  gray: "neutral",
  charcoal: "neutral",
  navy: "neutral",
  denim: "neutral",
  khaki: "neutral",
  camel: "neutral",

  red: "warm",
  orange: "warm",
  yellow: "warm",
  gold: "warm",
  mustard: "warm",
  coral: "warm",
  rust: "warm",
  terracotta: "warm",
  peach: "warm",
  maroon: "warm",
  burgundy: "warm",
  olive: "warm",

  blue: "cool",
  green: "cool",
  purple: "cool",
  lavender: "cool",
  teal: "cool",
  turquoise: "cool",
  mint: "cool",
  pink: "cool",
  magenta: "cool",
  indigo: "cool",
  lilac: "cool",
};

export function colorGroup(name: string | null | undefined): ColorGroup | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (key in COLOR_GROUPS) return COLOR_GROUPS[key];
  for (const known of Object.keys(COLOR_GROUPS)) {
    if (key.includes(known)) return COLOR_GROUPS[known];
  }
  return null;
}

/** 0-1 compatibility score for a pair of colour names. */
export function colorPairScore(a: string | null | undefined, b: string | null | undefined): number {
  const ga = colorGroup(a);
  const gb = colorGroup(b);
  if (!ga || !gb) return 0.6; // unknown colour, assume fine
  if (ga === "neutral" || gb === "neutral") return 0.9;
  if (ga === gb) return 0.8;
  return 0.55; // opposite warm/cool groups — still wearable, less ideal
}

/** Average pairwise colour score across a set of items' primary colours. */
export function outfitColorScore(colors: (string | null | undefined)[]): number {
  const present = colors.filter(Boolean) as string[];
  if (present.length < 2) return 0.75;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      total += colorPairScore(present[i], present[j]);
      pairs++;
    }
  }
  return pairs ? total / pairs : 0.75;
}
