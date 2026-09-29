import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function cachePathFor(id) {
  return path.join(config.referenceTranscriptCacheDir, `${id}.json`);
}

function readCache(id) {
  const p = cachePathFor(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCache(id, data) {
  ensureDir(config.referenceTranscriptCacheDir);
  fs.writeFileSync(cachePathFor(id), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Reference audio is transcribed exactly once and reused forever after,
 * keyed by the reference audio's id. The cache entry also stores a content
 * hash of the source audio file: if the user replaces a reference audio's
 * file on disk (same id, new content), that is automatically detected as
 * needing reprocessing without requiring a manual trigger. A manual
 * `force` reprocess is also always available.
 *
 * @param {{id:string, filePath:string}} referenceAudio
 * @param {{ transcribe: (filePath:string) => Promise<object> }} sttProvider
 * @param {{ force?: boolean }} [options]
 */
export async function getOrCreateReferenceTranscript(referenceAudio, sttProvider, options = {}) {
  const { force = false } = options;
  const currentHash = hashFile(referenceAudio.filePath);

  if (!force) {
    const cached = readCache(referenceAudio.id);
    if (cached && cached.audioHash === currentHash) {
      return { ...cached, fromCache: true };
    }
  }

  const sttResult = await sttProvider.transcribe(referenceAudio.filePath);

  const entry = {
    id: referenceAudio.id,
    sourceFile: referenceAudio.filename,
    audioHash: currentHash,
    text: sttResult.text,
    words: sttResult.words,
    language: sttResult.language,
    duration: sttResult.duration,
    generatedAt: new Date().toISOString(),
  };

  writeCache(referenceAudio.id, entry);

  return { ...entry, fromCache: false };
}

export function getCachedReferenceTranscript(id) {
  return readCache(id);
}
