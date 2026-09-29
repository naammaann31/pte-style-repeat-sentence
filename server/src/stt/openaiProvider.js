import fs from 'node:fs';
import { config } from '../config.js';

/**
 * Optional hosted STT provider. Not used by default (whisper-local requires
 * no key and runs offline). Provided so a better/hosted provider can be
 * swapped in later purely via STT_PROVIDER=openai + OPENAI_API_KEY, with
 * zero changes to the scoring engine, which only depends on the
 * {text, words, language, duration} shape returned here.
 *
 * The API key is read from a server-side environment variable only - it is
 * never sent to or reachable from the browser.
 */
class OpenAIProvider {
  async transcribe(filePath) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Set it server-side to use the "openai" STT provider.');
    }

    const form = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    form.append('file', new Blob([fileBuffer]), 'audio.wav');
    form.append('model', config.openai.model);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.openai.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI transcription failed: ${res.status} ${errText}`);
    }

    const data = await res.json();

    const words = Array.isArray(data.words)
      ? data.words.map((w) => ({ word: w.word, start: w.start, end: w.end, probability: null }))
      : [];

    return {
      text: data.text || '',
      words,
      language: data.language || 'en',
      duration: data.duration || null,
    };
  }
}

export const openaiProvider = new OpenAIProvider();
