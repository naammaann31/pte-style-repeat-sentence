const BASE = '/api';

async function toError(res) {
  let message = res.statusText || 'Request failed';
  try {
    const data = await res.json();
    if (data?.error?.message) message = data.error.message;
  } catch {
    // response wasn't JSON - keep statusText
  }
  const err = new Error(message);
  err.status = res.status;
  return err;
}

export async function fetchQuestions() {
  const res = await fetch(`${BASE}/questions`);
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function fetchReferenceTranscript(questionId) {
  const res = await fetch(`${BASE}/questions/${questionId}/reference-transcript`);
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function reprocessReferenceTranscript(questionId) {
  const res = await fetch(`${BASE}/questions/${questionId}/reference-transcript/reprocess`, {
    method: 'POST',
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function uploadAttempt(questionId, blob, durationSec) {
  const form = new FormData();
  form.append('audio', blob, `recording.${blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
  form.append('durationSec', String(durationSec));
  const res = await fetch(`${BASE}/questions/${questionId}/attempts`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function analyzeAttempt(attemptId) {
  const res = await fetch(`${BASE}/attempts/${attemptId}/analyze`, { method: 'POST' });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export function attemptAudioUrl(attemptId) {
  return `${BASE}/attempts/${attemptId}/audio`;
}
