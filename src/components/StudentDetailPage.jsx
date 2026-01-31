import { useState, useEffect } from 'react'
import { getStudentGradesById, getDetailedStudentFeedback } from '../data/supabaseData'
import VideoPlayer from './VideoPlayer'

function StudentDetailPage({ student, onBack }) {
  const [studentGrades, setStudentGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentFeedback, setSelectedStudentFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gradeData = await getStudentGradesById(student.id)
        setStudentGrades(gradeData)
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [student.id])

  if (loading) {
    return <div className="student-detail-page">Loading...</div>
  }
  
  // Use grades directly since they already contain assignment information
  const assignmentGrades = studentGrades.map(grade => ({
    id: grade.assignmentId,
    assignmentName: grade.assignmentName,
    grade: grade.grade,
    points: grade.points,
    maxPoints: 100,
    status: grade.status
  }))

  // Calculate total grade
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

  return (
    <div className="student-detail-page">
      <div className="student-detail-header">
        <h2 className="student-detail-title">{student.name}</h2>
        <p className="student-detail-email">{student.email}</p>
      </div>

      <div className="assignments-grades-section">
        <h3 className="section-title">Assignment Grades</h3>
        <div className="assignments-grades-list">
          {assignmentGrades.map(assignment => (
            <div
              key={assignment.id}
              className="assignment-grade-card"
              onClick={() => assignment.status === 'Graded' && viewAssignmentFeedback(assignment.id)}
              style={{ cursor: assignment.status === 'Graded' ? 'pointer' : 'default' }}
            >
              <div className="assignment-grade-info">
                <h4 className="assignment-grade-name">{assignment.assignmentName}</h4>
                <span className={`assignment-grade-status ${assignment.status.toLowerCase().replace(' ', '-')}`}>
                  {assignment.status}
                </span>
              </div>
              <div className="assignment-grade-details">
                <span className="assignment-grade-value">{assignment.grade}</span>
                <span className="assignment-grade-points">
                  {assignment.points}/{assignment.maxPoints}
                </span>
                {assignment.status === 'Graded' && (
                  <span className="view-feedback-hint" style={{ fontSize: '0.8rem', color: '#007BFF' }}>
                    Click to view feedback
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="total-grade-section">
        <div className="total-grade-card">
          <h3 className="total-grade-title">Total Grade</h3>
          <div className="total-grade-info">
            <span className="total-grade-letter">{totalLetterGrade}</span>
            <span className="total-grade-percentage">{totalPercentage}%</span>
            <span className="total-grade-points">{totalPoints}/{totalMaxPoints} points</span>
          </div>
        </div>
      </div>

      <button className="back-btn" onClick={onBack}>
        Back
      </button>

      {/* Loading indicator */}
      {feedbackLoading && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', padding: '2rem' }}>
            Loading feedback...
          </div>
        </div>
      )}

      {/* Teacher Feedback Modal */}
      {selectedStudentFeedback && (
        <div className="modal-overlay" onClick={closeFeedbackModal}>
          <div className="modal-content teacher-feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-feedback-header">
              <h2>Detailed Feedback: {selectedStudentFeedback.student?.name || student.name}</h2>
              <button className="close-modal-btn" onClick={closeFeedbackModal}>×</button>
            </div>

            <div className="teacher-feedback-content">
              {/* Grade Summary */}
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

                {/* Component Score Breakdown */}
                {selectedStudentFeedback.grade && (
                  <div className="component-scores">
                    <h4>Score Breakdown (Weighted Average)</h4>
                    <div className="score-components">
                      <div className="score-component">
                        <span className="component-label">
                          Speech Content (80%):
                        </span>
                        <span className="component-score">
                          {selectedStudentFeedback.grade.speechContentScore ?? 'N/A'}/4
                        </span>
                      </div>
                      <div className="score-component">
                        <span className="component-label">
                          Filler Words (20%):
                        </span>
                        <span className="component-score">
                          {selectedStudentFeedback.grade.fillerWordScore ?? 'N/A'}/20
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript */}
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

              {/* AI Feedback */}
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

                  <div className="feedback-category">
                    <h4>Delivery & Language Analysis</h4>
                    <div>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: selectedStudentFeedback.feedback.bodyLanguage?.includes('✓') ? '#22c55e' : '#ef4444'
                      }}>
                        {selectedStudentFeedback.feedback.bodyLanguage || '✗ Did not use hands effectively'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Player */}
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