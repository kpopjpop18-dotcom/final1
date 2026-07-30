#!/usr/bin/env node
// Auto-generates public/cards/manifest.json from whatever image files exist
// in public/cards/. Just drop images in — no renaming or JSON editing needed.
//
// Optional: prefix a filename with a rarity to control the odds tier:
//   common-*.jpg    rare-*.jpg    ultra-*.jpg    impossible-*.jpg
// No prefix = "common".
//
// Runs automatically on `bun run build` (and locally via `bun run cards`).

import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const CARDS_DIR = join(process.cwd(), "public", "cards");
const MANIFEST = join(CARDS_DIR, "manifest.json");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);
const RARITIES = ["common", "rare", "ultra", "impossible"];

function rarityFrom(name) {
  const lower = name.toLowerCase();
  for (const r of RARITIES) {
    if (lower.startsWith(r + "-") || lower.startsWith(r + "_")) return r;
  }
  return "common";
}

function main() {
  let entries = [];
  try {
    entries = readdirSync(CARDS_DIR);
  } catch {
    console.warn("[cards] public/cards/ not found — skipping manifest generation");
    return;
  }

  const cards = [];
  const seen = new Set();

  for (const file of entries.sort()) {
    const full = join(CARDS_DIR, file);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (!s.isFile()) continue;

    const ext = extname(file).toLowerCase();
    if (!EXTS.has(ext)) continue;

    const stem = basename(file, ext);
    let id = stem.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
    if (!id) id = `card-${cards.length + 1}`;
    // ensure uniqueness
    let unique = id, n = 2;
    while (seen.has(unique)) unique = `${id}-${n++}`;
    seen.add(unique);

    cards.push({
      id: unique,
      image: `/cards/${file}`,
      rarity: rarityFrom(stem),
    });
  }

  const manifest = { $schema: "./manifest.schema.json", version: 1, cards };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[cards] wrote manifest.json with ${cards.length} card${cards.length === 1 ? "" : "s"}`);
}

main();
