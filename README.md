# She Has Options

A personal AI-powered wardrobe app. Catalog your clothes by photo, get AI-suggested outfits, check if two pieces match, and build packing lists — all running locally on your own machine.

## Features

- **Photo upload + AI tagging** — Claude's vision API auto-detects category, color, pattern, season, and formality
- **Optional garment extraction** — isolate just the clothing item from a photo of you wearing it (removes body/background), using a local ONNX model, no cloud involved
- **Outfit suggestions** — AI-generated or a built-in offline fallback, weather-aware (defaults to Dubai)
- **"Does this match?"** — quick compatibility check between any two or more items
- **Wear/laundry tracking** — log wear, flag items as needing a wash, get reminders for things you haven't worn in a while
- **Packing lists** — generate a day-by-day capsule for a trip from your existing wardrobe
- **Multiple accounts** — simple username/password login, each with a fully separate wardrobe

## Stack

Next.js (App Router) + TypeScript + Tailwind, SQLite via Prisma, local file storage for photos, Claude API for AI features.

## Running it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. You'll need an Anthropic API key in a `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
```

All your photos and data stay on your machine — the only external call is to the Anthropic API for AI tagging/suggestions (and Open-Meteo for weather, which needs no key).
