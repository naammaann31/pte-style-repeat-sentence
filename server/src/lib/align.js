// Word-level sequence alignment between a reference transcript and a user
// transcript, using classic edit-distance dynamic programming (the same
// technique underlying Word Error Rate scoring). This replaces naive
// index-by-index comparison, which breaks the instant a word is missing or
// added (everything after the gap would otherwise be misreported).
//
// Output is an ordered list of operations describing exactly how the user's
// words relate to the reference:
//   CORRECT      - reference word spoken correctly
//   SUBSTITUTED  - reference word replaced by a different word
//   MISSING      - reference word not spoken at all
//   EXTRA        - word spoken that has no counterpart in the reference

export const AlignOp = Object.freeze({
  CORRECT: 'correct',
  SUBSTITUTED: 'substituted',
  MISSING: 'missing',
  EXTRA: 'extra',
});

/**
 * @param {string[]} refWords - normalized reference words (ground truth)
 * @param {string[]} hypWords - normalized user/hypothesis words
 * @returns {{ ops: Array<{type:string, ref?:string, hyp?:string}>, correct:number, missing:number, extra:number, substituted:number }}
 */
export function alignWords(refWords, hypWords) {
  const m = refWords.length;
  const n = hypWords.length;

  // dp[i][j] = min edit cost to align refWords[0..i) with hypWords[0..j)
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  // backtrace[i][j] = which move produced dp[i][j]: 'match' | 'sub' | 'del' | 'ins'
  const backtrace = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));

  for (let i = 1; i <= m; i++) {
    dp[i][0] = i;
    backtrace[i][0] = 'del'; // reference word with no hypothesis counterpart
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j;
    backtrace[0][j] = 'ins'; // hypothesis word with no reference counterpart
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        backtrace[i][j] = 'match';
        continue;
      }

      const subCost = dp[i - 1][j - 1] + 1;
      const delCost = dp[i - 1][j] + 1;
      const insCost = dp[i][j - 1] + 1;

      const minCost = Math.min(subCost, delCost, insCost);
      dp[i][j] = minCost;

      if (minCost === subCost) backtrace[i][j] = 'sub';
      else if (minCost === delCost) backtrace[i][j] = 'del';
      else backtrace[i][j] = 'ins';
    }
  }

  const ops = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const move = backtrace[i][j];
    if (move === 'match') {
      ops.push({ type: AlignOp.CORRECT, ref: refWords[i - 1], hyp: hypWords[j - 1] });
      i -= 1;
      j -= 1;
    } else if (move === 'sub') {
      ops.push({ type: AlignOp.SUBSTITUTED, ref: refWords[i - 1], hyp: hypWords[j - 1] });
      i -= 1;
      j -= 1;
    } else if (move === 'del') {
      ops.push({ type: AlignOp.MISSING, ref: refWords[i - 1] });
      i -= 1;
    } else {
      // 'ins'
      ops.push({ type: AlignOp.EXTRA, hyp: hypWords[j - 1] });
      j -= 1;
    }
  }
  ops.reverse();

  const counts = { correct: 0, missing: 0, extra: 0, substituted: 0 };
  for (const op of ops) {
    if (op.type === AlignOp.CORRECT) counts.correct += 1;
    else if (op.type === AlignOp.MISSING) counts.missing += 1;
    else if (op.type === AlignOp.EXTRA) counts.extra += 1;
    else if (op.type === AlignOp.SUBSTITUTED) counts.substituted += 1;
  }

  return { ops, ...counts };
}
