import './StudentEvaluationCard.css';

export default function StudentEvaluationCard({ evaluation }) {
  if (!evaluation) {
    return null;
  }

  const {
    criteria_scores = [],
    total_score = 0,
    max_total_score = 0,
    overall_feedback = '',
    improvement_suggestions = '',
    fallback = false,
    raw_response = '',
  } = evaluation;

  const getScoreColor = (score, maxScore) => {
    if (maxScore === 0) return 'score-neutral';
    const ratio = score / maxScore;
    if (ratio >= 1) return 'score-full';
    if (ratio >= 0.5) return 'score-partial';
    return 'score-zero';
  };

  const getScorePercentage = () => {
    if (max_total_score === 0) return 0;
    return Math.round((total_score / max_total_score) * 100);
  };

  if (fallback) {
    return (
      <div className="student-evaluation-card">
        <div className="fallback-warning">
          <svg className="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="warning-content">
            <h3 className="warning-title">Structured Grading Unavailable</h3>
            <p className="warning-text">We couldn't parse the evaluation into a structured format. Here's the raw feedback:</p>
          </div>
        </div>
        <div className="fallback-response">
          <pre className="raw-response-text">{raw_response}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="student-evaluation-card">
      <div className="evaluation-header">
        <div className="evaluation-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="evaluation-title">Your Evaluation Results</h2>
      </div>

      <div className="total-score-section">
        <div className="total-score-ring">
          <svg className="score-circle" viewBox="0 0 100 100">
            <circle
              className="score-circle-bg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className={`score-circle-fill ${getScoreColor(total_score, max_total_score)}`}
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${getScorePercentage() * 2.83} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="score-text">
            <span className="score-value">{total_score}</span>
            <span className="score-separator">/</span>
            <span className="score-max">{max_total_score}</span>
          </div>
        </div>
        <p className="total-score-label">Total Score</p>
      </div>

      <div className="criteria-section">
        <h3 className="section-title">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Criteria Breakdown
        </h3>
        <div className="criteria-list">
          {criteria_scores.map((criterion, index) => (
            <div key={criterion.criterion_id || index} className="criterion-row">
              <div className="criterion-header">
                <span className="criterion-name">{criterion.criterion_name}</span>
                <span className={`criterion-score ${getScoreColor(criterion.score, criterion.max_score)}`}>
                  {criterion.score}/{criterion.max_score}
                </span>
              </div>
              <div className="criterion-progress">
                <div
                  className={`criterion-progress-fill ${getScoreColor(criterion.score, criterion.max_score)}`}
                  style={{ width: `${criterion.max_score > 0 ? (criterion.score / criterion.max_score) * 100 : 0}%` }}
                />
              </div>
              <p className="criterion-feedback">{criterion.feedback}</p>
            </div>
          ))}
        </div>
      </div>

      {overall_feedback && (
        <div className="feedback-section overall-feedback-section">
          <h3 className="section-title">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Overall Feedback
          </h3>
          <p className="feedback-text">{overall_feedback}</p>
        </div>
      )}

      {improvement_suggestions && (
        <div className="feedback-section improvement-section">
          <h3 className="section-title">
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            How to Improve
          </h3>
          <p className="feedback-text">{improvement_suggestions}</p>
        </div>
      )}
    </div>
  );
}
