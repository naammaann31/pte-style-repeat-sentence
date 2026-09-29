import { Phase } from './state/phases.js';
import { useTestEngine } from './state/useTestEngine.js';
import { Instruction } from './components/Instruction.jsx';
import { ProgressHeader } from './components/ProgressHeader.jsx';
import { CountdownOverlay } from './components/CountdownOverlay.jsx';
import { RecordingStage } from './components/RecordingStage.jsx';
import { ResultsPanel } from './components/ResultsPanel.jsx';
import { SummaryPanel } from './components/SummaryPanel.jsx';
import { DebugPanel } from './components/DebugPanel.jsx';
import { ErrorPanel } from './components/ErrorPanel.jsx';

function ProcessingCard({ label }) {
  return (
    <div className="card processing-card">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export default function App() {
  const engine = useTestEngine();
  const { phase, questions, currentIndex, currentQuestion, countdown, recordingSeconds, error, currentResult, results, referenceTranscript, processingLabel, audioRef, actions } = engine;

  const total = questions.length;
  const isLastQuestion = currentIndex + 1 >= total;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Repeat the Sentence</h1>
      </header>

      {/* Reference audio element persists across the whole app lifetime so
          its 'ended' event and play state are never disturbed by re-renders. */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      <main className="app-main">
        {phase === Phase.LOADING && <div className="card">Loading questions...</div>}

        {phase === Phase.INSTRUCTIONS && <Instruction totalQuestions={total} onStart={actions.startTest} />}

        {phase !== Phase.LOADING && phase !== Phase.INSTRUCTIONS && phase !== Phase.COMPLETED && phase !== Phase.ERROR && currentQuestion && (
          <>
            <ProgressHeader index={currentIndex} total={total} statusLabel={phaseStatusLabel(phase)} />

            {(phase === Phase.PREPARING_QUESTION || phase === Phase.REFERENCE_TRANSCRIPTION) && (
              <div className="card processing-card">
                <div className="spinner" />
                <p>Preparing question...</p>
              </div>
            )}

            {phase === Phase.PRE_AUDIO_COUNTDOWN && (
              <CountdownOverlay value={countdown} message="Get ready. The sentence will play shortly." />
            )}

            {phase === Phase.PLAYING_REFERENCE && (
              <div className="card countdown-card">
                <p className="countdown-message">Listen carefully...</p>
              </div>
            )}

            {phase === Phase.POST_AUDIO_COUNTDOWN && (
              <CountdownOverlay value={countdown} message="Get ready to repeat the sentence." />
            )}

            {phase === Phase.RECORDING && <RecordingStage seconds={recordingSeconds} onStop={actions.stopRecording} />}

            {phase === Phase.SAVING_RECORDING && <ProcessingCard label="Saving your recording..." />}

            {phase === Phase.TRANSCRIBING_USER && <ProcessingCard label={processingLabel || 'Analyzing your response...'} />}

            {phase === Phase.RESULTS && (
              <ResultsPanel
                index={currentIndex}
                total={total}
                result={currentResult}
                isLastQuestion={isLastQuestion}
                onNext={actions.nextQuestion}
              />
            )}
          </>
        )}

        {phase === Phase.COMPLETED && <SummaryPanel results={results} questions={questions} />}

        {phase === Phase.ERROR && <ErrorPanel error={error} onRetry={actions.retryCurrentQuestion} />}
      </main>

      {questions.length > 0 && (
        <footer className="app-footer">
          <DebugPanel
            phase={phase}
            currentQuestion={currentQuestion}
            referenceTranscript={referenceTranscript}
            currentResult={currentResult}
            onReprocessReference={currentQuestion ? actions.forceReprocessReference : null}
          />
        </footer>
      )}
    </div>
  );
}

function phaseStatusLabel(phase) {
  switch (phase) {
    case Phase.PREPARING_QUESTION:
    case Phase.REFERENCE_TRANSCRIPTION:
      return 'Preparing...';
    case Phase.PRE_AUDIO_COUNTDOWN:
      return 'Get ready to listen';
    case Phase.PLAYING_REFERENCE:
      return 'Listen carefully...';
    case Phase.POST_AUDIO_COUNTDOWN:
      return 'Get ready to repeat';
    case Phase.RECORDING:
      return 'Recording...';
    case Phase.SAVING_RECORDING:
      return 'Saving...';
    case Phase.TRANSCRIBING_USER:
      return 'Analyzing...';
    case Phase.RESULTS:
      return 'Results';
    default:
      return '';
  }
}
