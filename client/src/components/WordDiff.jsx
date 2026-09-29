const ICONS = {
  correct: '✓',
  missing: '✗',
  extra: '+',
  substituted: '±',
};

export function WordDiff({ ops }) {
  if (!ops || ops.length === 0) return <p className="muted">No comparison available.</p>;

  return (
    <div className="word-diff">
      {ops.map((op, i) => {
        if (op.type === 'correct') {
          return (
            <span key={i} className="word-chip word-correct">
              {ICONS.correct} {op.ref}
            </span>
          );
        }
        if (op.type === 'missing') {
          return (
            <span key={i} className="word-chip word-missing">
              {ICONS.missing} {op.ref}
            </span>
          );
        }
        if (op.type === 'extra') {
          return (
            <span key={i} className="word-chip word-extra">
              {ICONS.extra} {op.hyp}
            </span>
          );
        }
        return (
          <span key={i} className="word-chip word-substituted" title={`said "${op.hyp}" instead of "${op.ref}"`}>
            {`${ICONS.substituted} ${op.ref}→${op.hyp}`}
          </span>
        );
      })}
    </div>
  );
}
