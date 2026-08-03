import { NextResponse } from "next/server";
import { getCurrentWeather } from "@/lib/weather";

export async function GET() {
  try {
    const weather = await getCurrentWeather();
    return NextResponse.json(weather);
  } catch {
    return NextResponse.json({ error: "Weather unavailable" }, { status: 503 });
  }
}
