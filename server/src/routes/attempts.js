import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { getReferenceAudioById } from '../lib/referenceAudio.js';
import { getOrCreateReferenceTranscript } from '../lib/transcriptCache.js';
import { getSttProvider } from '../stt/index.js';
import { analyzeAttempt } from '../lib/scoring/index.js';
import {
  saveAttemptMetadata,
  readAttemptMetadata,
  updateAttemptMetadata,
  extensionForMimeType,
  userRecordingDirFor,
  absolutePathForAttempt,
} from '../lib/attempts.js';
import { asyncHandler, HttpError } from '../lib/asyncHandler.js';
import { config } from '../config.js';

export const attemptsRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, userRecordingDirFor(req.params.id));
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${req.attemptId}${extensionForMimeType(file.mimetype)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB is generous for a single spoken sentence
});

function assignAttemptId(req, res, next) {
  req.attemptId = crypto.randomUUID();
  next();
}

function toPublicAttempt(metadata) {
  if (!metadata) return null;
  const { audioAbsolutePath, ...publicFields } = metadata;
  return publicFields;
}

function requireQuestion(req, res, next) {
  const item = getReferenceAudioById(req.params.id);
  if (!item) return next(new HttpError(404, `Reference audio not found for question "${req.params.id}".`));
  req.referenceAudio = item;
  next();
}

// Save the user's recording. This is the mandatory, never-skipped first
// step after "Stop Recording" - happens before any transcription. Every
// attempt gets a brand-new id and its own file; nothing is ever overwritten.
attemptsRouter.post(
  '/questions/:id/attempts',
  requireQuestion,
  assignAttemptId,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No audio file was uploaded.');

    const attemptId = req.attemptId;
    const clientDurationSec = req.body.durationSec ? Number(req.body.durationSec) : null;

    const metadata = {
      attemptId,
      questionId: req.params.id,
      referenceAudioFile: req.referenceAudio.filename,
      // Stored relative to the project root (not process.cwd(), which
      // depends on where the server happens to be launched from) so
      // recordings stay resolvable even if the project folder is renamed
      // or moved later.
      audioFilePath: path.relative(config.rootDir, req.file.path),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      clientDurationSec,
      createdAt: new Date().toISOString(),
      status: 'saved',
    };

    saveAttemptMetadata(attemptId, metadata);

    res.status(201).json({
      attemptId,
      questionId: req.params.id,
      audioUrl: `/api/attempts/${attemptId}/audio`,
      status: 'saved',
    });
  })
);

attemptsRouter.get(
  '/attempts/:attemptId/audio',
  asyncHandler(async (req, res) => {
    const metadata = readAttemptMetadata(req.params.attemptId);
    if (!metadata) throw new HttpError(404, 'Recording not found.');
    res.setHeader('Content-Type', metadata.mimeType || 'audio/webm');
    res.sendFile(absolutePathForAttempt(metadata));
  })
);

attemptsRouter.get(
  '/attempts/:attemptId',
  asyncHandler(async (req, res) => {
    const metadata = readAttemptMetadata(req.params.attemptId);
    if (!metadata) throw new HttpError(404, 'Attempt not found.');
    res.json({ attempt: toPublicAttempt(metadata) });
  })
);

// Transcribes the saved user recording (never fabricated/estimated) and
// scores it against the question's cached reference transcript.
attemptsRouter.post(
  '/attempts/:attemptId/analyze',
  asyncHandler(async (req, res) => {
    const metadata = readAttemptMetadata(req.params.attemptId);
    if (!metadata) throw new HttpError(404, 'Attempt not found.');

    const referenceAudio = getReferenceAudioById(metadata.questionId);
    if (!referenceAudio) throw new HttpError(404, `Reference audio not found for question "${metadata.questionId}".`);

    const provider = getSttProvider();

    const referenceTranscript = await getOrCreateReferenceTranscript(referenceAudio, provider);
    const userSttResult = await provider.transcribe(absolutePathForAttempt(metadata));

    const analysis = analyzeAttempt({
      referenceText: referenceTranscript.text,
      userSttResult,
      durationSec: metadata.clientDurationSec ?? userSttResult.duration,
    });

    const updated = updateAttemptMetadata(req.params.attemptId, {
      status: 'analyzed',
      analyzedAt: new Date().toISOString(),
      referenceTranscript: {
        text: referenceTranscript.text,
        words: referenceTranscript.words,
        fromCache: referenceTranscript.fromCache,
      },
      userTranscript: {
        text: userSttResult.text,
        words: userSttResult.words,
      },
      alignment: analysis.alignment,
      metrics: analysis.metrics,
    });

    res.json({ attempt: toPublicAttempt(updated) });
  })
);
