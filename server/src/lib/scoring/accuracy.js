/**
 * Word accuracy is computed from the alignment, not raw string similarity.
 * Only exact CORRECT matches count toward accuracy; substitutions count as
 * errors (they are tracked separately so the UI can show them distinctly
 * from missing/extra words).
 */
export function computeAccuracy({ correct, wordsExpected }) {
  if (wordsExpected === 0) return 0;
  const pct = (correct / wordsExpected) * 100;
  return Math.round(pct * 10) / 10; // one decimal place, e.g. 85.7
}
