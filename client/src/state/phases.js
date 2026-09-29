// Explicit state machine phases for the test engine. Exactly one of these is
// active at a time; the UI and available actions are derived from it so
// invalid actions (e.g. "Next Question" during recording) are impossible.
export const Phase = Object.freeze({
  LOADING: 'LOADING',
  INSTRUCTIONS: 'INSTRUCTIONS',
  PREPARING_QUESTION: 'PREPARING_QUESTION',
  REFERENCE_TRANSCRIPTION: 'REFERENCE_TRANSCRIPTION',
  PRE_AUDIO_COUNTDOWN: 'PRE_AUDIO_COUNTDOWN',
  PLAYING_REFERENCE: 'PLAYING_REFERENCE',
  POST_AUDIO_COUNTDOWN: 'POST_AUDIO_COUNTDOWN',
  RECORDING: 'RECORDING',
  SAVING_RECORDING: 'SAVING_RECORDING',
  TRANSCRIBING_USER: 'TRANSCRIBING_USER',
  RESULTS: 'RESULTS',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
});

export const COUNTDOWN_SECONDS = 5;
