# Outfit Book

A mobile-first PWA for saving outfit screenshots, tagging them, and building a shopping list of what to buy to recreate looks you like. Everything is stored locally on your device (IndexedDB) — no server, no account, no data leaving your phone.

## Features

- **Save outfits** — upload a screenshot (from your camera roll or camera), tag it with category/tags/notes.
- **Browse & search** — grid gallery, filter by category, search tags/notes.
- **Outfit detail** — full image view, edit tags/notes/category, favorite, delete.
- **Shopping list** — jot down items you still need, optionally linked back to the outfit that inspired them.
- **Installable** — add it to your phone's home screen and it behaves like a native app (works offline, no browser chrome).

## Running locally

```bash
npm install
npm run dev
```

Open the printed URL. To try it on your phone while developing, run `npm run dev -- --host` and open `http://<your-computer-ip>:5173/sandbox/` on your phone (same Wi-Fi network).

## Getting it on your phone (GitHub Pages)

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes the app to GitHub Pages whenever `main` is updated.

1. Merge this branch into `main` (or push directly to `main`).
2. In the repo settings, go to **Settings → Pages** and set **Source** to **GitHub Actions** (one-time setup).
3. After the workflow run finishes, your app will be live at:
   `https://<your-github-username>.github.io/sandbox/`
4. Open that URL on your phone and:
   - **iOS (Safari):** tap Share → "Add to Home Screen".
   - **Android (Chrome):** tap the menu (⋮) → "Add to Home screen" / "Install app".

It'll now open full-screen like a normal app, and your saved outfits stay on your phone between visits.

## Notes on the shopping-smarter workflow

- Save screenshots of outfits you like as you come across them (Pinterest, Instagram, in-store, etc.), tagging them by category (Casual, Work, Date Night, etc.) and adding freeform tags (color, style, season).
- When you notice something specific you'd need to recreate a look, add it to the Shopping List directly from that outfit's detail view — it stays linked so you remember why you wanted it.
- Use the Gallery search/filter to check what you already have inspiration for before buying something new, and to spot patterns in what you're drawn to (colors, silhouettes, categories) so you can shop more intentionally.

## Tech

- React + TypeScript + Vite
- Tailwind CSS v4
- IndexedDB via `idb` (images stored as blobs, no external storage/upload)
- `vite-plugin-pwa` for the installable app shell + offline caching
