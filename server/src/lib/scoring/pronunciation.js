/**
 * Estimated Pronunciation.
 *
 * When the STT provider exposes per-word confidence (faster-whisper does),
 * we use the average word probability as a defensible proxy: low ASR
 * confidence strongly correlates with unclear/mispronounced speech. This is
 * NOT phoneme-level pronunciation assessment.
 *
 * If a provider exposes no confidence/phoneme data at all, we fall back to
 * an alignment-derived proxy (weaker signal, clearly labeled).
 *
 * This function is intentionally isolated so a real phoneme-level engine
 * (e.g. a forced-aligner or a provider with native pronunciation scoring)
 * can be swapped in later without touching the rest of the scoring pipeline.
 */
export function computePronunciation({ words, alignment, wordsExpected }) {
  if (Array.isArray(words) && words.length > 0) {
    const withProb = words.filter((w) => typeof w.probability === 'number');
    if (withProb.length > 0) {
      const avgProb = withProb.reduce((sum, w) => sum + w.probability, 0) / withProb.length;
      return {
        score: Math.round(avgProb * 1000) / 10,
        method: 'stt-confidence',
        label: 'Estimated Pronunciation',
      };
    }
  }

  const correct = alignment?.correct ?? 0;
  const total = wordsExpected || 1;
  const proxy = (correct / total) * 100;
  return {
    score: Math.round(proxy * 10) / 10,
    method: 'alignment-fallback',
    label: 'Estimated Pronunciation',
  };
}
