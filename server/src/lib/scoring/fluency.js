/**
 * Estimated Fluency - transparent, measurable-signal-based scoring.
 *
 * NOT a validated standardized fluency metric (PTE/IELTS/TOEFL etc). It
 * combines speaking rate (words per minute) against a natural-speech target
 * range, plus pause/silence analysis derived from STT word-level timestamps
 * when available. Always labeled "Estimated Fluency" in the UI.
 */
export function computeFluency({ durationSec, words, recognizedWordCount }, tunables) {
  if (!durationSec || durationSec <= 0 || !recognizedWordCount) {
    return {
      score: 0,
      wpm: 0,
      pauseCount: 0,
      longPauseCount: 0,
      speechRatio: 0,
      label: 'Estimated Fluency',
      notes: 'Not enough speech detected to estimate fluency.',
    };
  }

  const minutes = durationSec / 60;
  const wpm = recognizedWordCount / minutes;

  let pauseCount = 0;
  let longPauseCount = 0;
  let totalPauseSec = 0;

  if (Array.isArray(words) && words.length > 1) {
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].start - words[i - 1].end;
      if (gap > tunables.pauseThresholdSec) {
        pauseCount += 1;
        totalPauseSec += gap;
        if (gap > tunables.longPauseThresholdSec) longPauseCount += 1;
      }
    }
  }

  const speechRatio = Math.max(0, Math.min(1, 1 - totalPauseSec / durationSec));

  let wpmScore;
  if (wpm >= tunables.idealWpmMin && wpm <= tunables.idealWpmMax) {
    wpmScore = 100;
  } else if (wpm < tunables.idealWpmMin) {
    wpmScore = Math.max(0, 100 - (tunables.idealWpmMin - wpm) * 2);
  } else {
    wpmScore = Math.max(0, 100 - (wpm - tunables.idealWpmMax) * 1.5);
  }

  const speechRatioScore = speechRatio * 100;
  const longPausePenalty = Math.min(40, longPauseCount * 10);

  const raw = wpmScore * 0.5 + speechRatioScore * 0.5 - longPausePenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    wpm: Math.round(wpm),
    pauseCount,
    longPauseCount,
    speechRatio: Math.round(speechRatio * 100) / 100,
    label: 'Estimated Fluency',
  };
}
