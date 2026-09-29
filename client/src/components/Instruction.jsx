export function Instruction({ totalQuestions, onStart }) {
  return (
    <div className="card instruction-card">
      <h1>Repeat the Sentence</h1>
      <p className="instruction-text">
        You will hear a sentence. Please repeat the sentence exactly as you hear it. You will
        hear the sentence only once.
      </p>
      <p className="muted">
        This test has {totalQuestions} question{totalQuestions === 1 ? '' : 's'}. Each question
        plays a reference sentence once, then records your spoken response.
      </p>
      <button className="btn btn-primary" onClick={onStart}>
        Start Test
      </button>
    </div>
  );
}
