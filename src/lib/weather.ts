// Live weather for outfit suggestions. Defaults to Dubai — override via
// WEATHER_LAT / WEATHER_LON env vars for a different emirate/city.

const LAT = process.env.WEATHER_LAT || "25.2048";
const LON = process.env.WEATHER_LON || "55.2708";
const TIMEZONE = process.env.WEATHER_TIMEZONE || "Asia/Dubai";
const LOCATION_NAME = process.env.WEATHER_LOCATION_NAME || "Dubai";

// WMO weather codes -> short label + emoji. https://open-meteo.com/en/docs
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear sky", emoji: "☀️" },
  1: { label: "Mostly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Fog", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌧️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  80: { label: "Rain showers", emoji: "🌦️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  // Dust/sand haze — common in UAE, not a standard WMO code everywhere but Open-Meteo uses it regionally.
};

export type Weather = {
  location: string;
  tempC: number;
  humidity: number;
  condition: string;
  emoji: string;
  isHot: boolean;
  isVeryHot: boolean;
  isRainy: boolean;
};

let cached: { data: Weather; expiresAt: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function getCurrentWeather(): Promise<Weather> {
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=${encodeURIComponent(TIMEZONE)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Weather lookup failed: ${res.status}`);
  const json = await res.json();

  const code = json.current.weather_code as number;
  const meta = WMO_CODES[code] ?? { label: "Unknown", emoji: "🌡️" };
  const tempC = json.current.temperature_2m as number;

  const data: Weather = {
    location: LOCATION_NAME,
    tempC,
    humidity: json.current.relative_humidity_2m,
    condition: meta.label,
    emoji: meta.emoji,
    isHot: tempC >= 30,
    isVeryHot: tempC >= 38,
    isRainy: [51, 53, 55, 61, 63, 65, 80, 95].includes(code),
  };

  cached = { data, expiresAt: Date.now() + CACHE_MS };
  return data;
}
