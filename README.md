# Archive of Stars

A cozy K-pop photocard collecting game built with TanStack Start, React, Tailwind CSS, and Supabase (Lovable Cloud).

## Features

- **Daily login rewards** with chickens (spins) and a 7-day streak rare gift.
- **Spin the wheel** every 2 hours to win photocards from the shared library.
- **Rarity system**: Common, Rare, Ultra Rare, and Impossible.
- **Binder customization**: name your binders, move cards, remove duplicates, and mark favorites.
- **Social**: add friends, view their binders, trade cards, and adopt unwanted cards.
- **Admin dashboard**: password-protected (`atiny-admin`) with global rarity controls, player stats, and photocard management.
- **Persistent accounts**: progress is saved to the cloud for every user.

## Quick start

```bash
bun install
bun run dev
```

The app runs on [http://localhost:8080](http://localhost:8080) by default.

## Deploy

See [`DEPLOY.md`](DEPLOY.md) for step-by-step Netlify + GitHub instructions.

## Shared photocard library

Photocards are stored in `public/cards/` and described by `public/cards/manifest.json`. Run `bun run cards` to regenerate the manifest after adding images. The build step runs this automatically.

## Tech stack

- TanStack Start
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase / Lovable Cloud
- Netlify (via Nitro preset)
