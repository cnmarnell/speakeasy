import { useState, useEffect } from 'react'
import { getStudentProgressForAssignment, getDetailedStudentFeedback } from '../data/supabaseData'
import VideoPlayer from './VideoPlayer'

function AssignmentDetailPage({ assignment, onBack, onViewStudent }) {
  const [revealedStudentGrades, setRevealedStudentGrades] = useState({})
  const [studentProgressData, setStudentProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentFeedback, setSelectedStudentFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const fetchStudentProgress = async () => {
      try {
        if (!assignment?.id) {
          setLoading(false)
          return
        }

        const progressData = await getStudentProgressForAssignment(assignment.id)
        
        // Convert to format expected by UI
        const formattedData = progressData.map(progress => ({
          id: progress.studentId,
          name: progress.name,
          email: progress.email,
          status: progress.status,
          grade: progress.grade
        }))
        setStudentProgressData(formattedData)
      } catch (error) {
        console.error('Error fetching student progress:', error)
      } finally {
        setLoading(false)
      }
    }

    if (assignment) {
      fetchStudentProgress()
    } else {
      setLoading(false)
    }
  }, [assignment])

  const toggleStudentGradeReveal = (studentId) => {
    setRevealedStudentGrades(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }))
  }

  const viewStudentFeedback = async (studentId) => {
    setFeedbackLoading(true)
    try {
      const feedbackData = await getDetailedStudentFeedback(assignment.id, studentId)
      setSelectedStudentFeedback(feedbackData)
    } catch (error) {
      console.error('Error fetching student feedback:', error)
      alert('Failed to load student feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const closeFeedbackModal = () => {
    setSelectedStudentFeedback(null)
  }

  if (loading) {
    return <div className="assignment-detail-page">Loading...</div>
  }

  if (!assignment) {
    return (
      <div className="assignment-detail-page">
        <h2>Assignment not found</h2>
        <button className="back-btn" onClick={onBack}>
          Back to Class
        </button>
      </div>
    )
  }

  return (
    <div className="assignment-detail-page">
      <div className="assignment-detail-header">
        <h2 className="assignment-detail-title">{assignment.title}</h2>
        <p className="assignment-detail-description">{assignment.description}</p>
        <p className="assignment-detail-due">Due: {assignment.dueDate}</p>
      </div>

      <div className="student-progress-section">
        <h3 className="section-title">Student Progress</h3>
        <div className="student-progress-list">
          {studentProgressData.map(student => (
            <div key={student.id} className="student-progress-card">
              <div className="student-progress-info" onClick={() => onViewStudent(student)}>
                <h4 className="student-progress-name">{student.name}</h4>
                <p className="student-progress-email">{student.email}</p>
              </div>
              <div className="student-progress-details">
                <span className={`progress-status ${student.status.toLowerCase().replace(' ', '-')}`}>
                  {student.status}
                </span>
                <div className="assignment-grade-section">
                  <button 
                    className="assignment-grade-reveal-btn"
                    onClick={() => toggleStudentGradeReveal(student.id)}
                  >
                    {revealedStudentGrades[student.id] ? "Hide Grade" : "Show Grade"}
                  </button>
                  {revealedStudentGrades[student.id] && (
                    <span className="assignment-student-grade">
                      Grade: {student.grade}
                    </span>
                  )}
                </div>
                {student.status !== 'Not Started' && (
                  <button 
                    className="view-feedback-btn"
                    onClick={() => viewStudentFeedback(student.id)}
                    disabled={feedbackLoading}
                  >
                    {feedbackLoading ? 'Loading...' : 'View Feedback'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="back-btn" onClick={onBack}>
        Back to Class
      </button>

      {/* Teacher Feedback Modal */}
      {selectedStudentFeedback && (
        <div className="modal-overlay" onClick={closeFeedbackModal}>
          <div className="modal-content teacher-feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-feedback-header">
              <h2>Detailed Feedback: {selectedStudentFeedback.student.name}</h2>
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
                    <div
                      style={{ color: 'black' }}
                      dangerouslySetInnerHTML={{
                        __html: selectedStudentFeedback.feedback.bodyLanguage
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br>')
                          .replace(/•/g, '&bull;')
                      }}
                    />
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

export default AssignmentDetailPage