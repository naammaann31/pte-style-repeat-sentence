# Repeat the Sentence - Speaking Assessment

A local "repeat the sentence" speaking assessment app. Supports an arbitrary
number of reference recordings out of the box - drop files into
`reference_audio/` and the test picks them up automatically, in order, with
no code changes.

## Architecture

```
reference_audio/            <- reference sentence recordings (add/remove freely)
data/
  reference_transcripts/    <- one cached transcript JSON per reference audio
  attempts/                 <- one JSON record per user attempt (never overwritten)
storage/
  user_recordings/<questionId>/<attemptId>.webm  <- saved user recordings, permanent

server/   Express API - question discovery, transcript caching, STT, scoring
client/   React app - the state-machine-driven test UI (Vite)
```

Server responsibilities:
- Discover reference audio files, assign stable IDs, deterministic order.
- Transcribe each reference audio **once** and cache the transcript on disk
  (keyed by a content hash, so replacing a file automatically invalidates
  its cache; a manual "reprocess" endpoint also exists).
- Save every user recording permanently and independently (no overwrites).
- Transcribe the user's recording (never fabricated) and score it against
  the reference transcript using a real word-alignment algorithm.

Client responsibilities:
- Drive the exact required flow via an explicit state machine
  (`client/src/state/useTestEngine.js` / `phases.js`): countdown -> play
  reference once -> countdown -> record -> save -> transcribe -> score ->
  results -> next question -> ... -> summary.
- Nothing here is hardcoded per-question; the same engine runs for 1, 10, or
  100 questions because it just iterates the array the server returns.

## One-time setup

### 1. Python environment for local speech-to-text

Speech-to-text runs **fully offline and free**, via
[faster-whisper](https://github.com/SYSTRAN/faster-whisper) (CTranslate2 +
Whisper), so no API key is required at all by default.

```powershell
cd server
npm run setup:python
```

This creates `server/python/.venv` and installs `faster-whisper`. The model
(`small.en` by default, ~500MB) downloads automatically the first time a
transcription is requested.

### 2. Install dependencies

```powershell
cd server
npm install

cd ../client
npm install
```

## Running

Two terminals:

```powershell
# Terminal 1 - API server (port 8787)
cd server
npm run dev

# Terminal 2 - React app (port 5173, proxies /api to the server)
cd client
npm run dev
```

Open http://localhost:5173.

For a single-port production-style run: `npm run build` in `client/`, then
`npm run dev` (or `npm start`) in `server/` - the server serves the built
client automatically when `client/dist` exists.

## Adding more reference recordings

Just drop more audio files (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`)
into `reference_audio/`. Nothing else needs to change:

- The question list, `Question X of N` progress, and the test engine all
  derive from what's on disk.
- Ordering is alphabetical by filename by default. To control order
  explicitly, add a `reference_audio/order.json` file containing an array of
  filenames in the order you want; any files not listed are appended
  alphabetically after them.
- Each file gets its own stable id (a slug of its filename) and its own
  transcript cache entry - existing files are **not** re-transcribed when you
  add new ones.

## Reference transcript caching

- First request for a question transcribes its reference audio and writes
  `data/reference_transcripts/<id>.json` (text, word timestamps, confidence,
  a content hash, and a timestamp).
- Every later request reuses that file - the reference audio is never sent
  to STT twice unless the file's content actually changes (hash mismatch) or
  you explicitly force it:

  ```
  POST /api/questions/:id/reference-transcript/reprocess
  ```

  (also exposed as a button in the collapsible Debug panel in the UI).

## Swapping the speech-to-text provider

All scoring code depends only on the shape
`{ text, words: [{word, start, end, probability}], language, duration }` -
never on a specific provider. To switch providers, set an environment
variable before starting the server:

```powershell
$env:STT_PROVIDER = "whisper-local"   # default, offline, free, no API key
# or
$env:STT_PROVIDER = "openai"
$env:OPENAI_API_KEY = "sk-..."        # server-side only, never sent to the browser
```

Other tunables (all optional, see `server/src/config.js`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | API server port |
| `WHISPER_MODEL_SIZE` | `small.en` | faster-whisper model (`base.en`, `medium.en`, ...) |
| `WHISPER_DEVICE` | `cpu` | `cpu` or `cuda` if you have a supported GPU |
| `WHISPER_COMPUTE_TYPE` | `int8` | CTranslate2 quantization |

## Scoring methodology (transparent, not a standardized test)

- **Accuracy**: `correct words / expected reference words`, where
  correct/missing/extra/substituted are determined by a Levenshtein-style
  word-level sequence alignment (`server/src/lib/align.js`) - not naive
  index-by-index or string-similarity comparison.
- **Estimated Fluency**: words-per-minute vs. a natural-speech target range,
  combined with pause/silence analysis from STT word timestamps
  (`server/src/lib/scoring/fluency.js`). Explicitly labeled "Estimated" -
  this is not PTE/IELTS/TOEFL/Pearson scoring.
- **Estimated Pronunciation**: average STT word-confidence as a proxy signal
  (`server/src/lib/scoring/pronunciation.js`), falling back to an
  alignment-derived estimate if a provider exposes no confidence. Designed
  so a real phoneme-level engine can be substituted later without touching
  anything else.

## Notes

- Recordings are saved as real audio files under `storage/user_recordings/`
  (never Base64/localStorage), one file per attempt, never overwritten.
- Every attempt gets its own JSON record under `data/attempts/` linking
  question -> reference audio -> reference transcript -> user recording ->
  user transcript -> results.
