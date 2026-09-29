export function ProgressHeader({ index, total, statusLabel }) {
  return (
    <div className="progress-header">
      <div className="progress-title">
        Question {index + 1} of {total}
      </div>
      {statusLabel && <div className="progress-status">{statusLabel}</div>}
    </div>
  );
}
