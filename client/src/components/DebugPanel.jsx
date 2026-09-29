export function DebugPanel({ phase, currentQuestion, referenceTranscript, currentResult, onReprocessReference }) {
  return (
    <details className="debug-panel">
      <summary>Debug information</summary>
      <div className="debug-body">
        <p>
          <strong>State:</strong> {phase}
        </p>
        <p>
          <strong>Current question id:</strong> {currentQuestion?.id ?? '(none)'}
        </p>
        {onReprocessReference && (
          <button className="btn btn-secondary" onClick={onReprocessReference}>
            Force reprocess reference transcript
          </button>
        )}
        <h4>Reference transcript</h4>
        <pre>{JSON.stringify(referenceTranscript, null, 2)}</pre>
        <h4>Current attempt result</h4>
        <pre>{JSON.stringify(currentResult, null, 2)}</pre>
      </div>
    </details>
  );
}
