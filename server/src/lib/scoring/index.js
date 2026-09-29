import { normalizeToWords } from '../normalize.js';
import { alignWords } from '../align.js';
import { computeAccuracy } from './accuracy.js';
import { computeFluency } from './fluency.js';
import { computePronunciation } from './pronunciation.js';
import { config } from '../../config.js';

/**
 * Full scoring pipeline for one attempt: normalize both transcripts, align
 * them word-by-word, then derive accuracy/fluency/pronunciation metrics.
 * Pure function of its inputs - no I/O - so it is easy to unit test and to
 * re-run if the alignment/scoring logic is improved later.
 */
export function analyzeAttempt({ referenceText, userSttResult, durationSec }) {
  const refWords = normalizeToWords(referenceText);
  const userWords = normalizeToWords(userSttResult.text);

  const alignment = alignWords(refWords, userWords);

  const wordsExpected = refWords.length;
  const wordsRecognized = userWords.length;

  const accuracy = computeAccuracy({ correct: alignment.correct, wordsExpected });
  const fluency = computeFluency(
    {
      durationSec: durationSec ?? userSttResult.duration ?? null,
      words: userSttResult.words,
      recognizedWordCount: wordsRecognized,
    },
    config.fluency
  );
  const pronunciation = computePronunciation({
    words: userSttResult.words,
    alignment,
    wordsExpected,
  });

  return {
    referenceWords: refWords,
    userWords,
    alignment,
    metrics: {
      wordsExpected,
      wordsRecognized,
      correctWords: alignment.correct,
      missingWords: alignment.missing,
      extraWords: alignment.extra,
      substitutedWords: alignment.substituted,
      accuracy,
      fluency,
      pronunciation,
    },
  };
}
