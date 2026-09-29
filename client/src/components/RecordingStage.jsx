function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function RecordingStage({ seconds, onStop }) {
  return (
    <div className="card recording-card">
      <p className="recording-label">Speak now.</p>
      <div className="recording-indicator">
        <span className="recording-dot" />
        Recording... {formatSeconds(seconds)}
      </div>
      <button className="btn btn-danger" onClick={onStop}>
        Stop Recording
      </button>
    </div>
  );
}
