// Text normalization for comparing reference vs. user transcripts.
//
// Goal: strip formatting differences that carry no speaking-accuracy signal
// (case, punctuation, contraction spelling, hyphenation, whitespace) while
// leaving genuine word-level differences (missing/extra/substituted words)
// fully detectable by the alignment stage.

const CONTRACTIONS = {
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "won't": 'will not',
  "wouldn't": 'would not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "mightn't": 'might not',
  "mustn't": 'must not',
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "i'd": 'i would',
  "you'd": 'you would',
  "he'd": 'he would',
  "she'd": 'she would',
  "we'd": 'we would',
  "they'd": 'they would',
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "we'll": 'we will',
  "they'll": 'they will',
  "let's": 'let us',
  "that's": 'that is',
  "who's": 'who is',
  "what's": 'what is',
  "there's": 'there is',
  "here's": 'here is',
};

/**
 * Normalize raw transcript text into a canonical string suitable for
 * tokenization. Intentionally conservative: only collapses formatting
 * variance, never removes/reorders/merges actual words.
 */
export function normalizeText(rawText) {
  if (!rawText) return '';

  let text = rawText.toLowerCase();

  // Normalize curly quotes/apostrophes to a plain apostrophe so contraction
  // lookups and punctuation stripping behave consistently.
  text = text.replace(/[‘’ʼ]/g, "'");
  text = text.replace(/[“”]/g, '"');

  // Expand common contractions (whole-word matches only).
  text = text.replace(/\b[a-z]+'[a-z]+\b/g, (match) => CONTRACTIONS[match] || match);

  // Treat hyphens as word separators so "twenty-five" and "twenty five"
  // tokenize identically.
  text = text.replace(/-/g, ' ');

  // Strip thousands separators inside numbers: "25,000" -> "25000".
  text = text.replace(/(\d),(\d{3})/g, '$1$2');

  // Remove any remaining punctuation (keep letters, digits, apostrophes,
  // whitespace). Apostrophes that survive here are inside words we didn't
  // recognize as contractions (e.g. names) - leave them as-is.
  text = text.replace(/[^\p{L}\p{N}'\s]/gu, ' ');

  // Collapse whitespace.
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/** Normalize and tokenize text into an array of words. */
export function normalizeToWords(rawText) {
  const normalized = normalizeText(rawText);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}
