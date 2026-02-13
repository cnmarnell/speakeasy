import { useState, useEffect } from 'react'
import { getStudentGradesById, getDetailedStudentFeedback } from '../data/supabaseData'
import VideoPlayer from './VideoPlayer'

function StudentDetailPage({ student, onBack, className }) {
  const [studentGrades, setStudentGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentFeedback, setSelectedStudentFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gradeData = await getStudentGradesById(student.id, className || null)
        setStudentGrades(gradeData)
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [student.id, className])

  if (loading) {
    return (
      <div className="student-detail-page sdp-redesign">
        <div className="cp-loading">
          <div className="cp-spinner"></div>
          <p>Loading student data...</p>
        </div>
      </div>
    )
  }
  
  const assignmentGrades = studentGrades.map(grade => ({
    id: grade.assignmentId,
    assignmentName: grade.assignmentName,
    grade: grade.grade,
    points: grade.points,
    maxPoints: 100,
    status: grade.status
  }))

  const gradedAssignments = assignmentGrades.filter(assignment => assignment.status === "Graded")
  const totalPoints = gradedAssignments.reduce((sum, assignment) => sum + assignment.points, 0)
  const totalMaxPoints = gradedAssignments.reduce((sum, assignment) => sum + assignment.maxPoints, 0)
  const totalPercentage = totalMaxPoints > 0 ? Math.round((totalPoints / totalMaxPoints) * 100) : 0
  
  const getLetterGrade = (percentage) => {
    if (percentage >= 97) return "A+"
    if (percentage >= 93) return "A"
    if (percentage >= 90) return "A-"
    if (percentage >= 87) return "B+"
    if (percentage >= 83) return "B"
    if (percentage >= 80) return "B-"
    if (percentage >= 77) return "C+"
    if (percentage >= 73) return "C"
    if (percentage >= 70) return "C-"
    if (percentage >= 67) return "D+"
    if (percentage >= 63) return "D"
    if (percentage >= 60) return "D-"
    return "F"
  }

  const totalLetterGrade = getLetterGrade(totalPercentage)
  const totalSubmissions = assignmentGrades.filter(a => a.status !== 'Not Submitted').length

  const viewAssignmentFeedback = async (assignmentId) => {
    setFeedbackLoading(true)
    try {
      const feedbackData = await getDetailedStudentFeedback(assignmentId, student.id)
      setSelectedStudentFeedback(feedbackData)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const closeFeedbackModal = () => {
    setSelectedStudentFeedback(null)
  }

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#22c55e'
    if (percentage >= 80) return '#3b82f6'
    if (percentage >= 70) return '#f59e0b'
    if (percentage >= 60) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="student-detail-page sdp-redesign">
      {/* Back Button */}
      <button className="sdp-back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        {className ? `Back to ${className}` : 'Back'}
      </button>

      {/* Student Overview Card */}
      <div className="sdp-overview-card">
        <div className="sdp-overview-left">
          <div className="sdp-avatar-large">
            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="sdp-student-info">
            <h2 className="sdp-student-name">{student.name}</h2>
            <p className="sdp-student-email">{student.email}</p>
          </div>
        </div>
        <div className="sdp-overview-stats">
          <div className="sdp-grade-circle" style={{ borderColor: getGradeColor(totalPercentage) }}>
            <span className="sdp-grade-letter" style={{ color: getGradeColor(totalPercentage) }}>{totalLetterGrade}</span>
            <span className="sdp-grade-pct">{totalPercentage}%</span>
          </div>
          <div className="sdp-overview-numbers">
            <div className="sdp-overview-stat">
              <span className="sdp-overview-stat-value">{totalPoints}/{totalMaxPoints}</span>
              <span className="sdp-overview-stat-label">Total Points</span>
            </div>
            <div className="sdp-overview-stat">
              <span className="sdp-overview-stat-value">{totalSubmissions}</span>
              <span className="sdp-overview-stat-label">Submissions</span>
            </div>
            <div className="sdp-overview-stat">
              <span className="sdp-overview-stat-value">{gradedAssignments.length}</span>
              <span className="sdp-overview-stat-label">Graded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="sdp-assignments-section">
        <h3 className="sdp-section-title">Assignment Grades</h3>
        <div className="sdp-assignments-list">
          {assignmentGrades.length === 0 ? (
            <div className="cp-empty-state">
              <p>No assignments found for this student.</p>
            </div>
          ) : (
            assignmentGrades.map(assignment => (
              <div
                key={assignment.id}
                className="sdp-assignment-row"
                onClick={() => assignment.status === 'Graded' && viewAssignmentFeedback(assignment.id)}
                style={{ cursor: assignment.status === 'Graded' ? 'pointer' : 'default' }}
              >
                <div className="sdp-assignment-info">
                  <h4 className="sdp-assignment-name">{assignment.assignmentName}</h4>
                  <span className={`sdp-assignment-status ${
                    assignment.status === 'Graded' ? 'sdp-status-graded' : 'sdp-status-notsubmitted'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
                <div className="sdp-assignment-score">
                  <span className="sdp-score-grade">{assignment.grade}</span>
                  <span className="sdp-score-points">{assignment.points}/{assignment.maxPoints}</span>
                  {assignment.status === 'Graded' && (
                    <span className="sdp-view-hint">Click to view feedback</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {feedbackLoading && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', padding: '2rem' }}>
            Loading feedback...
          </div>
        </div>
      )}

      {/* Teacher Feedback Modal (kept as-is) */}
      {selectedStudentFeedback && (
        <div className="modal-overlay" onClick={closeFeedbackModal}>
          <div className="modal-content teacher-feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-feedback-header">
              <h2>Detailed Feedback: {selectedStudentFeedback.student?.name || student.name}</h2>
              <button className="close-modal-btn" onClick={closeFeedbackModal}>×</button>
            </div>

            <div className="teacher-feedback-content">
              <div className="grade-summary">
                <h3>Grade Summary</h3>
                <div className="grade-details">
                  <span className="grade-score">
                    {selectedStudentFeedback.grade?.letterGrade || 'N/A'}
                    ({selectedStudentFeedback.grade?.totalScore || 'N/A'}/100)
                  </span>
                  {selectedStudentFeedback.grade?.gradedAt && (
                    <span className="grade-date">
                      Graded: {new Date(selectedStudentFeedback.grade.gradedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {selectedStudentFeedback.grade && (
                  <div className="component-scores">
                    <h4>Score Breakdown (Weighted Average)</h4>
                    <div className="score-components">
                      <div className="score-component">
                        <span className="component-label">Speech Content (80%):</span>
                        <span className="component-score">
                          {selectedStudentFeedback.grade.speechContentScore ?? 'N/A'}/{selectedStudentFeedback.grade.contentScoreMax ?? 4}
                        </span>
                      </div>
                      <div className="score-component">
                        <span className="component-label">Filler Words (20%):</span>
                        <span className="component-score">
                          {selectedStudentFeedback.grade.fillerWordScore ?? 'N/A'}/20
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="teacher-transcript-section">
                <h3>Speech Transcript</h3>
                <div className="teacher-transcript-content">
                  {selectedStudentFeedback.submission?.transcript ? (
                    <p className="transcript-text">{selectedStudentFeedback.submission.transcript}</p>
                  ) : (
                    <p className="no-transcript">No transcript available</p>
                  )}
                </div>
                {selectedStudentFeedback.submission?.submittedAt && (
                  <p className="submission-info">
                    Submitted: {new Date(selectedStudentFeedback.submission.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {selectedStudentFeedback.feedback && (
                <div className="teacher-feedback-analysis">
                  <h3>AI Analysis & Feedback</h3>

                  <div className="feedback-category">
                    <h4>Filler Words Analysis</h4>
                    <div
                      style={{ color: 'black' }}
                      dangerouslySetInnerHTML={{
                        __html: selectedStudentFeedback.feedback.fillerWords
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br>')
                          .replace(/•/g, '&bull;')
                      }}
                    />

                    {selectedStudentFeedback.grade && (
                      <div className="filler-word-details">
                        <div className="filler-stats">
                          <span className="filler-count">
                            Count: {selectedStudentFeedback.grade.fillerWordCount || 0}
                          </span>
                          <span className="filler-score">
                            Score: {selectedStudentFeedback.grade.fillerWordScore || Math.max(0, 20 - (selectedStudentFeedback.grade.fillerWordCount || 0))}/20
                          </span>
                        </div>

                        {selectedStudentFeedback.grade.fillerWordsUsed &&
                         selectedStudentFeedback.grade.fillerWordsUsed.length > 0 && (
                          <div className="filler-words-used">
                            <strong>Detected filler words:</strong>
                            <div className="filler-word-tags">
                              {selectedStudentFeedback.grade.fillerWordsUsed.map((word, index) => {
                                const count = selectedStudentFeedback.grade.fillerWordCounts?.[word] || 1
                                return (
                                  <span key={index} className="filler-word-tag">
                                    {word} ({count}x)
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="feedback-category">
                    <h4>Speech Content Analysis</h4>
                    <div
                      style={{ color: 'black' }}
                      dangerouslySetInnerHTML={{
                        __html: selectedStudentFeedback.feedback.speechContent
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br>')
                          .replace(/•/g, '&bull;')
                      }}
                    />
                  </div>

                </div>
              )}

              {selectedStudentFeedback.submission?.videoUrl && (
                <div className="teacher-video-section">
                  <h3>Student Video</h3>
                  <VideoPlayer
                    videoUrl={selectedStudentFeedback.submission.videoUrl}
                    className="teacher-video-player"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDetailPage
