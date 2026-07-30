# Shared Photocard Library

Every image in this folder becomes a photocard **every player can win**.

## How to add cards

1. Drop image files into this folder (`public/cards/`). Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`.
2. Commit and push to GitHub. That's it.

On the next build, `scripts/generate-manifest.mjs` scans this folder and rewrites `manifest.json` automatically. Netlify redeploys, and every player pulls the new library on load.

## Setting rarity (optional)

By default every card is **common**. To make a card rarer, prefix its filename:

- `rare-anything.jpg`
- `ultra-anything.jpg`
- `impossible-anything.jpg`
- `common-anything.jpg` (or no prefix)

Anything after the prefix is up to you — spaces, weird characters, whatever. The `id` is auto-generated from the filename.

## Odds

Weighted per rarity: common 70 / rare 50 / ultra 30 / impossible 10.

## Removing a card

Delete the image file. Next build regenerates the manifest without it. Players who already own that card keep it.

## Run manually

```bash
bun run cards      # regenerate manifest.json from current files
```
