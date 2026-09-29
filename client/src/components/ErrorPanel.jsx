export function ErrorPanel({ error, onRetry }) {
  return (
    <div className="card error-card">
      <h2>Something went wrong</h2>
      <p>{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Retry this question
        </button>
      )}
      {error?.detail && (
        <details className="debug-panel">
          <summary>Technical details</summary>
          <pre>{error.detail}</pre>
        </details>
      )}
    </div>
  );
}
