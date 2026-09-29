import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function metaPathFor(attemptId) {
  return path.join(config.attemptsDataDir, `${attemptId}.json`);
}

/**
 * Every attempt gets its own JSON metadata file - never overwritten, never
 * shared between attempts, so Question 1 attempted three times produces
 * three fully independent records (and three separate audio files).
 */
export function saveAttemptMetadata(attemptId, data) {
  ensureDir(config.attemptsDataDir);
  fs.writeFileSync(metaPathFor(attemptId), JSON.stringify(data, null, 2), 'utf-8');
}

export function readAttemptMetadata(attemptId) {
  const p = metaPathFor(attemptId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function updateAttemptMetadata(attemptId, patch) {
  const existing = readAttemptMetadata(attemptId) || {};
  const merged = { ...existing, ...patch };
  saveAttemptMetadata(attemptId, merged);
  return merged;
}

const EXTENSION_BY_MIME = {
  'audio/webm': '.webm',
  'audio/webm;codecs=opus': '.webm',
  'audio/ogg': '.ogg',
  'audio/ogg;codecs=opus': '.ogg',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
};

export function extensionForMimeType(mimeType) {
  return EXTENSION_BY_MIME[mimeType] || '.webm';
}

export function userRecordingDirFor(questionId) {
  const dir = path.join(config.userRecordingsDir, questionId);
  ensureDir(dir);
  return dir;
}

/**
 * Resolves an attempt's saved-recording absolute path from its stored
 * root-relative `audioFilePath`, rather than trusting a stored absolute
 * path. This keeps recordings playable/transcribable even if the project
 * folder is later renamed or moved - only config.rootDir needs to be right,
 * never a path baked into old attempt JSON files.
 */
export function absolutePathForAttempt(metadata) {
  return path.join(config.rootDir, metadata.audioFilePath);
}
