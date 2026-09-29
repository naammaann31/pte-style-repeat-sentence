import { attemptAudioUrl } from '../api.js';
import { WordDiff } from './WordDiff.jsx';

function average(values) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function SummaryPanel({ results, questions }) {
  const completed = results.filter(Boolean);

  const avgAccuracy = average(completed.map((r) => r.metrics.accuracy));
  const avgFluency = average(completed.map((r) => r.metrics.fluency.score));
  const avgPronunciation = average(completed.map((r) => r.metrics.pronunciation.score));
  const totalExpected = completed.reduce((sum, r) => sum + r.metrics.wordsExpected, 0);
  const totalCorrect = completed.reduce((sum, r) => sum + r.metrics.correctWords, 0);
  const totalMissing = completed.reduce((sum, r) => sum + r.metrics.missingWords, 0);
  const totalExtra = completed.reduce((sum, r) => sum + r.metrics.extraWords, 0);

  return (
    <div className="card summary-card">
      <h1>Test Complete</h1>

      <table className="metrics-table">
        <tbody>
          <tr>
            <td>Total questions</td>
            <td>{questions.length}</td>
          </tr>
          <tr>
            <td>Questions completed</td>
            <td>{completed.length}</td>
          </tr>
          <tr>
            <td>Average accuracy</td>
            <td>{avgAccuracy}%</td>
          </tr>
          <tr>
            <td>Average estimated fluency</td>
            <td>{avgFluency} / 100</td>
          </tr>
          <tr>
            <td>Average estimated pronunciation</td>
            <td>{avgPronunciation} / 100</td>
          </tr>
          <tr>
            <td>Total words expected</td>
            <td>{totalExpected}</td>
          </tr>
          <tr>
            <td>Total correct words</td>
            <td>{totalCorrect}</td>
          </tr>
          <tr>
            <td>Total missing words</td>
            <td>{totalMissing}</td>
          </tr>
          <tr>
            <td>Total extra words</td>
            <td>{totalExtra}</td>
          </tr>
        </tbody>
      </table>

      <h2>Individual question results</h2>
      {questions.map((q, i) => {
        const r = results[i];
        return (
          <details key={q.id} className="summary-question">
            <summary>
              Question {i + 1} of {questions.length}
              {r ? ` - ${r.metrics.accuracy}% accuracy` : ' - not completed'}
            </summary>
            {r && (
              <div className="summary-question-body">
                <p className="transcript-text">
                  <strong>Reference:</strong> {r.referenceTranscript?.text}
                </p>
                <p className="transcript-text">
                  <strong>You said:</strong> {r.userTranscript?.text || '(no speech recognized)'}
                </p>
                <WordDiff ops={r.alignment?.ops} />
                <audio controls src={attemptAudioUrl(r.attemptId)} />
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
