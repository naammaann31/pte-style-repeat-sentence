import { attemptAudioUrl } from '../api.js';
import { MetricsTable } from './MetricsTable.jsx';
import { WordDiff } from './WordDiff.jsx';

export function ResultsPanel({ index, total, result, isLastQuestion, onNext }) {
  if (!result) return null;

  return (
    <div className="card results-card">
      <h2>
        Question {index + 1} of {total} - Results
      </h2>

      <div className="transcript-block">
        <h3>Reference sentence</h3>
        <p className="transcript-text">{result.referenceTranscript?.text}</p>
      </div>

      <div className="transcript-block">
        <h3>Your transcript</h3>
        <p className="transcript-text">
          {result.userTranscript?.text || <span className="muted">(no speech recognized)</span>}
        </p>
      </div>

      <MetricsTable metrics={result.metrics} />

      <div className="transcript-block">
        <h3>Word-level comparison</h3>
        <WordDiff ops={result.alignment?.ops} />
      </div>

      <div className="transcript-block">
        <h3>Your recording</h3>
        <audio controls src={attemptAudioUrl(result.attemptId)} />
      </div>

      <button className="btn btn-primary" onClick={onNext}>
        {isLastQuestion ? 'Finish Test' : 'Next Question'}
      </button>
    </div>
  );
}
