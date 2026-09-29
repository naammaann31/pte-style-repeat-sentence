import { useCallback, useEffect, useRef, useState } from 'react';
import { Phase, COUNTDOWN_SECONDS } from './phases.js';
import {
  fetchQuestions,
  fetchReferenceTranscript,
  reprocessReferenceTranscript,
  uploadAttempt,
  analyzeAttempt,
} from '../api.js';

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function browserSupportsRecording() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export function useTestEngine() {
  const [phase, setPhase] = useState(Phase.LOADING);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]); // one independent entry per question index
  const [referenceTranscript, setReferenceTranscript] = useState(null);
  const [processingLabel, setProcessingLabel] = useState('');
  // Bumped exactly when a question should (re)enter its prepare/transcribe
  // step (start, next, retry). Deliberately NOT `phase` - the effect below
  // itself calls setPhase(REFERENCE_TRANSCRIPTION), and depending on `phase`
  // there would cause React to tear down and re-run the effect (marking its
  // own in-flight fetch "cancelled") before it ever resolves.
  const [prepareTick, setPrepareTick] = useState(0);

  const audioRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const playedIndexRef = useRef(-1); // guards "reference audio plays exactly once per question"
  const countdownIntervalRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const currentQuestion = questions[currentIndex] || null;

  const fail = useCallback((message, debugDetail) => {
    console.error('[test-engine]', message, debugDetail || '');
    setError({ message, detail: debugDetail ? String(debugDetail.message || debugDetail) : null });
    setPhase(Phase.ERROR);
  }, []);

  // Load the question list once on mount. Adding/removing reference audio
  // files changes this list with no code changes required here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchQuestions();
        if (cancelled) return;
        if (!data.questions || data.questions.length === 0) {
          fail('No reference audio recordings were found. Add audio files to the reference_audio folder and reload.');
          return;
        }
        setQuestions(data.questions);
        setPhase(Phase.INSTRUCTIONS);
      } catch (err) {
        if (!cancelled) fail('Could not load the question list from the server.', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fail]);

  const startTest = useCallback(async () => {
    if (!browserSupportsRecording()) {
      fail('This browser does not support microphone recording (MediaRecorder API missing). Please use a recent version of Chrome, Edge, or Firefox.');
      return;
    }
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      fail('Microphone access was denied or is unavailable. Please allow microphone access and reload.', err);
      return;
    }
    setCurrentIndex(0);
    setResults([]);
    setPhase(Phase.PREPARING_QUESTION);
    setPrepareTick((t) => t + 1);
  }, [fail]);

  // --- PREPARING_QUESTION -> REFERENCE_TRANSCRIPTION -> PRE_AUDIO_COUNTDOWN ---
  useEffect(() => {
    if (phase !== Phase.PREPARING_QUESTION) return;
    if (!currentQuestion) return;

    let cancelled = false;
    setReferenceTranscript(null);
    setPhase(Phase.REFERENCE_TRANSCRIPTION);

    (async () => {
      try {
        const { transcript } = await fetchReferenceTranscript(currentQuestion.id);
        if (cancelled) return;
        setReferenceTranscript(transcript);
        setPhase(Phase.PRE_AUDIO_COUNTDOWN);
      } catch (err) {
        if (!cancelled) fail('Failed to prepare the reference transcript for this question.', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepareTick]);

  // --- Generic countdown runner for both PRE_AUDIO_COUNTDOWN and POST_AUDIO_COUNTDOWN ---
  useEffect(() => {
    const isPre = phase === Phase.PRE_AUDIO_COUNTDOWN;
    const isPost = phase === Phase.POST_AUDIO_COUNTDOWN;
    if (!isPre && !isPost) return;

    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        setPhase(isPre ? Phase.PLAYING_REFERENCE : Phase.RECORDING);
        return;
      }
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(countdownIntervalRef.current);
  }, [phase]);

  // --- PLAYING_REFERENCE: play the reference audio exactly once, wait for 'ended' ---
  useEffect(() => {
    if (phase !== Phase.PLAYING_REFERENCE) return;
    if (!currentQuestion || !audioRef.current) return;

    const audioEl = audioRef.current;

    // Listeners are attached on every effect invocation (including React
    // StrictMode's dev-only mount/cleanup/remount cycle) so 'ended' is never
    // silently dropped. Only the *playback itself* (src + play()) is guarded
    // to happen exactly once per question index.
    const handleEnded = () => setPhase(Phase.POST_AUDIO_COUNTDOWN);
    const handleError = () => fail('The reference audio for this question failed to play (file may be missing or corrupt).');

    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleError);

    if (playedIndexRef.current !== currentIndex) {
      playedIndexRef.current = currentIndex;
      audioEl.src = currentQuestion.referenceAudioUrl;
      audioEl.currentTime = 0;
      audioEl.play().catch((err) => fail('The reference audio could not be started.', err));
    }

    return () => {
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex]);

  // --- RECORDING: start MediaRecorder automatically, user controls when it stops ---
  useEffect(() => {
    if (phase !== Phase.RECORDING) return;
    if (!mediaStreamRef.current) {
      fail('Microphone stream is not available.');
      return;
    }

    const mimeType = pickSupportedMimeType();
    recordedChunksRef.current = [];

    let recorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current);
    } catch (err) {
      fail('Failed to start microphone recording.', err);
      return;
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    recorder.onerror = (event) => {
      fail('Recording failed unexpectedly.', event.error);
    };

    mediaRecorderRef.current = recorder;
    recordingStartedAtRef.current = performance.now();
    setRecordingSeconds(0);
    recorder.start();

    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds(Math.floor((performance.now() - recordingStartedAtRef.current) / 1000));
    }, 250);

    return () => {
      clearInterval(recordingIntervalRef.current);
      if (recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        recorder.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const durationSec = (performance.now() - recordingStartedAtRef.current) / 1000;

    recorder.onstop = async () => {
      clearInterval(recordingIntervalRef.current);

      const chunks = recordedChunksRef.current;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });

      if (blob.size < 500) {
        fail('No audio was captured. Please check your microphone and try this question again.');
        return;
      }

      try {
        setProcessingLabel('Saving your recording...');
        setPhase(Phase.SAVING_RECORDING);
        const saved = await uploadAttempt(currentQuestion.id, blob, durationSec);

        setProcessingLabel('Analyzing your response...');
        setPhase(Phase.TRANSCRIBING_USER);
        const { attempt } = await analyzeAttempt(saved.attemptId);

        setResults((prev) => {
          const next = [...prev];
          next[currentIndex] = attempt;
          return next;
        });
        setPhase(Phase.RESULTS);
      } catch (err) {
        fail('Failed to process your recording (save/transcribe/score step).', err);
      }
    };

    recorder.stop();
  }, [currentQuestion, currentIndex, fail]);

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setPhase(Phase.COMPLETED);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setPhase(Phase.PREPARING_QUESTION);
    setPrepareTick((t) => t + 1);
  }, [currentIndex, questions.length]);

  const retryCurrentQuestion = useCallback(() => {
    // A deliberate new attempt at the same question: the reference audio is
    // allowed to play again because this is an explicit user-initiated redo,
    // not an automatic replay.
    playedIndexRef.current = -1;
    setError(null);
    setPhase(Phase.PREPARING_QUESTION);
    setPrepareTick((t) => t + 1);
  }, []);

  const forceReprocessReference = useCallback(async () => {
    if (!currentQuestion) return;
    try {
      const { transcript } = await reprocessReferenceTranscript(currentQuestion.id);
      setReferenceTranscript(transcript);
    } catch (err) {
      console.error('Failed to reprocess reference transcript', err);
    }
  }, [currentQuestion]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(countdownIntervalRef.current);
      clearInterval(recordingIntervalRef.current);
    };
  }, []);

  return {
    phase,
    questions,
    currentIndex,
    currentQuestion,
    countdown,
    recordingSeconds,
    error,
    results,
    currentResult: results[currentIndex] || null,
    referenceTranscript,
    processingLabel,
    audioRef,
    actions: {
      startTest,
      stopRecording,
      nextQuestion,
      retryCurrentQuestion,
      forceReprocessReference,
    },
  };
}
