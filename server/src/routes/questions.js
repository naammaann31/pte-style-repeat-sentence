import { Router } from 'express';
import { listReferenceAudio, getReferenceAudioById } from '../lib/referenceAudio.js';
import { getOrCreateReferenceTranscript } from '../lib/transcriptCache.js';
import { getSttProvider } from '../stt/index.js';
import { asyncHandler, HttpError } from '../lib/asyncHandler.js';

export const questionsRouter = Router();

// Ordered list of every question the test currently has. Adding/removing
// files in reference_audio/ changes this list automatically - nothing here
// is specific to any individual audio file or count.
questionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = listReferenceAudio();
    const total = items.length;
    res.json({
      total,
      questions: items.map((item) => ({
        id: item.id,
        index: item.index,
        total,
        referenceAudioUrl: `/api/questions/${item.id}/audio`,
      })),
    });
  })
);

questionsRouter.get(
  '/:id/audio',
  asyncHandler(async (req, res) => {
    const item = getReferenceAudioById(req.params.id);
    if (!item) throw new HttpError(404, `Reference audio not found for question "${req.params.id}".`);
    res.sendFile(item.filePath);
  })
);

// Lazily transcribes the reference audio the first time it's needed, then
// reuses the cached transcript on every subsequent call - the reference
// audio is never sent to the STT system twice unless explicitly forced.
questionsRouter.get(
  '/:id/reference-transcript',
  asyncHandler(async (req, res) => {
    const item = getReferenceAudioById(req.params.id);
    if (!item) throw new HttpError(404, `Reference audio not found for question "${req.params.id}".`);

    const transcript = await getOrCreateReferenceTranscript(item, getSttProvider());
    res.json({ transcript });
  })
);

questionsRouter.post(
  '/:id/reference-transcript/reprocess',
  asyncHandler(async (req, res) => {
    const item = getReferenceAudioById(req.params.id);
    if (!item) throw new HttpError(404, `Reference audio not found for question "${req.params.id}".`);

    const transcript = await getOrCreateReferenceTranscript(item, getSttProvider(), { force: true });
    res.json({ transcript });
  })
);
