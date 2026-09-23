# Outfit Book

A mobile-first PWA for saving outfit screenshots, tagging them, and building a shopping list of what to buy to recreate looks you like. Everything is stored locally on your device (IndexedDB) — no server, no account, no data leaving your phone.

## Features

- **Bulk upload** — select many screenshots at once and review/edit them all before saving.
- **AI auto-tag (optional)** — suggest a category + tags per photo using Claude's vision model, one tap for a single photo or all of them at once. Requires a one-time backend setup (see below); everything else works without it.
- **Save outfits** — upload a screenshot (from your camera roll or camera), tag it with category/tags/notes.
- **Browse & search** — grid gallery, filter by category, search tags/notes.
- **Outfit detail** — full image view, edit tags/notes/category, favorite, delete.
- **Closet** — log the clothes you actually own (photo + type + tags, same bulk-upload and auto-tag flow as outfits), then tap **Suggest outfits** to get AI-generated combinations built only from what you own, informed by the outfits you've saved as inspiration.
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

## Auto-tag setup (optional)

Everything except auto-tagging works with zero setup, fully local. Auto-tagging calls Claude's vision API to look at a photo and suggest a category + tags — that requires a tiny backend, because a static site (like this one on GitHub Pages) can't hold an API key without exposing it to anyone who opens the page.

The backend is a single [Cloudflare Worker](https://workers.cloudflare.com/) (free tier is plenty) in `worker/index.js`. It receives one photo, calls Claude, and returns `{ category, tags }` — it never stores anything.

**Deploy it:**

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/).
2. Install Wrangler and log in: `npm install -g wrangler && wrangler login`
3. From the `worker/` directory: `wrangler deploy`
4. Set your API key as a secret (never commit it): `wrangler secret put ANTHROPIC_API_KEY`
5. Wrangler prints your Worker's URL (something like `https://outfit-book-autotag.<you>.workers.dev`).
6. In the app, go to **Add → the gear icon** and paste that URL in.

That's it — "Auto-tag this one" and "Auto-tag all" will now work. Each call costs a small fraction of a cent (Claude Opus 5 vision, one short request per photo); you can swap the `MODEL` constant in `worker/index.js` for `claude-haiku-4-5` if you want it cheaper for large batches.

The same Worker also powers Closet auto-tagging and outfit suggestions (it dispatches on a `mode` field in the request), so if you deployed it before the Closet tab existed, redeploy it once from the current `worker/index.js` (Cloudflare dashboard: Edit code → paste the current file → Deploy, or `wrangler deploy` again) — no new secret or settings needed, same URL keeps working.

## Notes on the shopping-smarter workflow

- Save screenshots of outfits you like as you come across them (Pinterest, Instagram, in-store, etc.), tagging them by category (Casual, Work, Date Night, etc.) and adding freeform tags (color, style, season).
- When you notice something specific you'd need to recreate a look, add it to the Shopping List directly from that outfit's detail view — it stays linked so you remember why you wanted it.
- Use the Gallery search/filter to check what you already have inspiration for before buying something new, and to spot patterns in what you're drawn to (colors, silhouettes, categories) so you can shop more intentionally.

## Tech

- React + TypeScript + Vite
- Tailwind CSS v4
- IndexedDB via `idb` (images stored as blobs, no external storage/upload)
- `vite-plugin-pwa` for the installable app shell + offline caching
