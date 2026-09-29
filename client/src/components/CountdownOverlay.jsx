export function CountdownOverlay({ value, message }) {
  return (
    <div className="card countdown-card">
      <p className="countdown-message">{message}</p>
      <div className="countdown-number">{value}</div>
    </div>
  );
}
