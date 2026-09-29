import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'audio';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Discover every reference audio file currently in reference_audio/, in
 * deterministic order. Adding/removing files there automatically changes
 * the question set - nothing here is hardcoded to a specific file or count.
 *
 * Ordering:
 *   - if reference_audio/order.json exists (an array of filenames), that
 *     order is used first, followed by any remaining files alphabetically.
 *   - otherwise, plain alphabetical (case-insensitive) filename order.
 *
 * IDs are derived from the filename (slugified) so they are stable across
 * server restarts and safe to use in URLs / cache filenames. Collisions are
 * disambiguated with a numeric suffix.
 */
export function listReferenceAudio() {
  ensureDir(config.referenceAudioDir);

  const allFiles = fs
    .readdirSync(config.referenceAudioDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => config.allowedReferenceExtensions.includes(path.extname(name).toLowerCase()));

  let orderedNames = [...allFiles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const orderFilePath = path.join(config.referenceAudioDir, config.referenceOrderFile);
  if (fs.existsSync(orderFilePath)) {
    try {
      const explicitOrder = JSON.parse(fs.readFileSync(orderFilePath, 'utf-8'));
      if (Array.isArray(explicitOrder)) {
        const explicitExisting = explicitOrder.filter((name) => allFiles.includes(name));
        const remaining = orderedNames.filter((name) => !explicitExisting.includes(name));
        orderedNames = [...explicitExisting, ...remaining];
      }
    } catch {
      // malformed order.json - ignore and fall back to alphabetical order
    }
  }

  const usedIds = new Map();
  const items = orderedNames.map((filename, index) => {
    const base = slugify(path.parse(filename).name);
    let id = base;
    let counter = 2;
    while (usedIds.has(id) && usedIds.get(id) !== filename) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.set(id, filename);

    return {
      id,
      index,
      filename,
      filePath: path.join(config.referenceAudioDir, filename),
    };
  });

  return items;
}

export function getReferenceAudioById(id) {
  return listReferenceAudio().find((item) => item.id === id) || null;
}
