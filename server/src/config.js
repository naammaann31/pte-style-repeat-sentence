import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src -> project root is two levels up
const ROOT_DIR = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT || 8787),

  rootDir: ROOT_DIR,
  referenceAudioDir: path.join(ROOT_DIR, 'reference_audio'),
  referenceTranscriptCacheDir: path.join(ROOT_DIR, 'data', 'reference_transcripts'),
  attemptsDataDir: path.join(ROOT_DIR, 'data', 'attempts'),
  userRecordingsDir: path.join(ROOT_DIR, 'storage', 'user_recordings'),
  clientDistDir: path.join(ROOT_DIR, 'client', 'dist'),

  allowedReferenceExtensions: ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'],
  referenceOrderFile: 'order.json',

  // STT provider selection. 'whisper-local' requires no API key (runs fully offline
  // via faster-whisper in a local Python worker process). 'openai' is provided as an
  // optional swap-in if the user later wants a hosted provider; it requires
  // OPENAI_API_KEY to be set server-side only.
  sttProvider: process.env.STT_PROVIDER || 'whisper-local',

  whisper: {
    pythonExecutable: process.env.WHISPER_PYTHON || defaultPythonExecutable(ROOT_DIR),
    model: process.env.WHISPER_MODEL_SIZE || 'small.en',
    device: process.env.WHISPER_DEVICE || 'cpu',
    computeType: process.env.WHISPER_COMPUTE_TYPE || 'int8',
    // how long to wait for a single transcription before treating the worker as hung
    requestTimeoutMs: Number(process.env.WHISPER_TIMEOUT_MS || 120000),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_STT_MODEL || 'whisper-1',
  },

  // fluency scoring tunables - kept centralized and transparent
  fluency: {
    idealWpmMin: 110,
    idealWpmMax: 170,
    pauseThresholdSec: 0.3,
    longPauseThresholdSec: 1.0,
  },
};

function defaultPythonExecutable(rootDir) {
  const venvPython = path.join(rootDir, 'server', 'python', '.venv', 'Scripts', 'python.exe');
  return venvPython;
}

export default config;
