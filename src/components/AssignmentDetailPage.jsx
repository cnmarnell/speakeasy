import { useState, useEffect } from 'react'
import { getStudentProgressForAssignment, getDetailedStudentFeedback } from '../data/supabaseData'
import VideoPlayer from './VideoPlayer'

function AssignmentDetailPage({ assignment, onBack, onViewStudent }) {
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

  // Compute assignment stats
  const totalStudents = studentProgressData.length
  const submittedCount = studentProgressData.filter(s => s.status !== 'Not Started').length
  const gradedCount = studentProgressData.filter(s => s.status === 'Graded' || s.status === 'Finished').length
  const notStartedCount = studentProgressData.filter(s => s.status === 'Not Started').length
  
  const gradesWithScores = studentProgressData
    .map(s => {
      const match = s.grade?.match(/(\d+)/)
      return match ? parseInt(match[1]) : null
    })
    .filter(g => g !== null)
  
  const avgScore = gradesWithScores.length > 0
    ? Math.round(gradesWithScores.reduce((a, b) => a + b, 0) / gradesWithScores.length)
    : 0
  const submissionRate = totalStudents > 0
    ? Math.round((submittedCount / totalStudents) * 100)
    : 0

  const getStatusClass = (status) => {
    const s = status?.toLowerCase().replace(' ', '-')
    if (s === 'graded' || s === 'finished') return 'adp-status-graded'
    if (s === 'submitted' || s === 'in-progress') return 'adp-status-submitted'
    if (s === 'not-started') return 'adp-status-notstarted'
    return 'adp-status-submitted'
  }

  if (loading) {
    return (
      <div className="assignment-detail-page adp-redesign">
        <div className="cp-loading">
          <div className="cp-spinner"></div>
          <p>Loading assignment data...</p>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="assignment-detail-page adp-redesign">
        <h2>Assignment not found</h2>
        <button className="cp-back-btn-inline" onClick={onBack}>
          Back to Class
        </button>
      </div>
    )
  }

  return (
    <div className="assignment-detail-page adp-redesign">
      {/* Header */}
      <div className="adp-header">
        <button className="adp-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Class
        </button>
        <div className="adp-header-info">
          <h2 className="adp-title">{assignment.title}</h2>
          {assignment.description && (
            <p className="adp-description">{assignment.description}</p>
          )}
          <div className="adp-due">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="adp-due-icon">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Due: {assignment.dueDate || 'No due date'}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="adp-stats-row">
        <div className="adp-stat-card adp-stat-avg">
          <span className="adp-stat-value">{avgScore}%</span>
          <span className="adp-stat-label">Average Score</span>
        </div>
        <div className="adp-stat-card adp-stat-rate">
          <span className="adp-stat-value">{submissionRate}%</span>
          <span className="adp-stat-label">Submission Rate</span>
        </div>
        <div className="adp-stat-card adp-stat-graded">
          <span className="adp-stat-value">{gradedCount}/{totalStudents}</span>
          <span className="adp-stat-label">Graded</span>
        </div>
        <div className="adp-stat-card adp-stat-pending">
          <span className="adp-stat-value">{notStartedCount}</span>
          <span className="adp-stat-label">Not Started</span>
        </div>
      </div>

      {/* Student Progress List */}
      <div className="adp-progress-section">
        <h3 className="adp-section-title">Student Progress</h3>
        <div className="adp-progress-list">
          {studentProgressData.length === 0 ? (
            <div className="cp-empty-state">
              <p>No students enrolled in this assignment yet.</p>
            </div>
          ) : (
            studentProgressData.map(student => (
              <div key={student.id} className="adp-student-row">
                <div className="adp-student-info" onClick={() => onViewStudent(student)}>
                  <div className="adp-student-avatar">
                    {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="adp-student-details">
                    <span className="adp-student-name">{student.name}</span>
                    <span className="adp-student-email">{student.email}</span>
                  </div>
                </div>
                <div className="adp-student-right">
                  <span className={`adp-status-badge ${getStatusClass(student.status)}`}>
                    {student.status}
                  </span>
                  <span className="adp-student-grade">{student.grade || 'N/A'}</span>
                  {student.status !== 'Not Started' && (
                    <button 
                      className="adp-view-btn"
                      onClick={() => viewStudentFeedback(student.id)}
                      disabled={feedbackLoading}
                    >
                      {feedbackLoading ? 'Loading...' : 'View'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Teacher Feedback Modal (kept as-is) */}
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

export default AssignmentDetailPage
