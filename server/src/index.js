import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Speaking assessment server listening on http://localhost:${config.port}`);
  console.log(`STT provider: ${config.sttProvider}`);
  if (config.sttProvider === 'whisper-local') {
    console.log(`Whisper model: ${config.whisper.model} (loads lazily on first transcription request)`);
  }
});
