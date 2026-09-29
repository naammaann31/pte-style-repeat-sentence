export function MetricsTable({ metrics }) {
  if (!metrics) return null;
  const rows = [
    ['Words expected', metrics.wordsExpected],
    ['Words recognized', metrics.wordsRecognized],
    ['Correct words', metrics.correctWords],
    ['Missing words', metrics.missingWords],
    ['Extra words', metrics.extraWords],
    ['Substituted words', metrics.substitutedWords],
    ['Accuracy', `${metrics.accuracy}%`],
    [metrics.fluency.label, `${metrics.fluency.score} / 100 (${metrics.fluency.wpm} wpm)`],
    [metrics.pronunciation.label, `${metrics.pronunciation.score} / 100`],
  ];

  return (
    <table className="metrics-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
