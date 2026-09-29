import { config } from '../config.js';
import { whisperLocalProvider } from './whisperLocalProvider.js';
import { openaiProvider } from './openaiProvider.js';

/**
 * All STT providers implement: transcribe(filePath) -> Promise<{
 *   text: string,
 *   words: Array<{ word: string, start: number, end: number, probability: number|null }>,
 *   language: string,
 *   duration: number,
 * }>
 *
 * The rest of the app (transcript cache, scoring engine, routes) only ever
 * depends on that shape, so a different/better provider can be dropped in
 * later by adding a file here and switching STT_PROVIDER - no other code
 * needs to change.
 */
const providers = {
  'whisper-local': whisperLocalProvider,
  openai: openaiProvider,
};

export function getSttProvider() {
  const provider = providers[config.sttProvider];
  if (!provider) {
    throw new Error(`Unknown STT_PROVIDER "${config.sttProvider}". Valid options: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}
