import { useState, useEffect } from 'react'
import { getAssignmentById, getAssignmentFeedback, getStudentAssignmentStatus, getStudentGradeForAssignment } from '../data/supabaseData'

function StudentAssignmentPage({ assignment, studentId, onBack, onViewRecording }) {
  const [assignmentData, setAssignmentData] = useState(null)
  const [studentStatus, setStudentStatus] = useState('Not Started')
  const [feedback, setFeedback] = useState(null)
  const [gradeData, setGradeData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!assignment?.id || !studentId) {
          setLoading(false)
          return
        }

        const [assignmentInfo, status, feedbackInfo, grade] = await Promise.all([
          getAssignmentById(assignment.id),
          getStudentAssignmentStatus(studentId, assignment.id),
          getAssignmentFeedback(assignment.id, studentId),
          getStudentGradeForAssignment(studentId, assignment.id)
        ])

        setAssignmentData(assignmentInfo)
        setStudentStatus(status)
        setFeedback(feedbackInfo)
        setGradeData(grade)
      } catch (error) {
        console.error('Error fetching assignment data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assignment?.id, studentId])
  
  const isCompleted = studentStatus === "In Progress"
  const isProcessing = studentStatus === "Processing..."
  const hasSubmission = isCompleted || isProcessing
  
  // Check if assignment is still due (can re-record)
  const isDueDatePassed = assignmentData ? new Date() > new Date(assignmentData.rawDueDate) : false
  const canRecord = !isDueDatePassed

  if (loading) {
    return <div className="student-assignment-page"><div className="loading-container"><div>Loading...</div></div></div>
  }

  if (!assignmentData) {
    return (
      <div className="student-assignment-page">
        <h2>Assignment not found</h2>
        <button className="sap-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="student-assignment-page sap-redesign">
      {/* Top navigation */}
      <div className="sap-top-nav">
        <button className="sap-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="m12 19-7-7 7-7"/>
          </svg>
          Back to Assignments
        </button>
      </div>

      {/* Header section */}
      <div className="sap-header">
        <h2 className="sap-title">{assignmentData.title}</h2>
        <p className="sap-description">{assignmentData.description}</p>
        {assignmentData.dueDate && (
          <div className="sap-due-date">
            <svg viewBox="0 0 20 20" fill="currentColor" className="sap-due-icon">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Due: {assignmentData.dueDate}
          </div>
        )}
      </div>

      {/* Record CTA - prominent when no submission */}
      {!hasSubmission && canRecord && (
        <div className="sap-record-cta" data-tutorial="record-cta">
          <div className="sap-record-cta-content">
            <div className="sap-record-cta-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <div className="sap-record-cta-text">
              <h3>Ready to Present?</h3>
              <p>Record your speech to receive AI-powered feedback on content, delivery, and filler words.</p>
            </div>
            <button className="sap-record-btn" onClick={() => onViewRecording(assignmentData || assignment)} data-tutorial="record-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
              </svg>
              Start Recording
            </button>
          </div>
        </div>
      )}

      {/* Re-record option when there's a submission */}
      {hasSubmission && canRecord && (
        <div className="sap-rerecord-bar">
          <span className="sap-submitted-badge">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Speech Submitted
          </span>
          <button className="sap-rerecord-btn" onClick={() => onViewRecording(assignmentData || assignment)}>
            Re-record Speech
          </button>
        </div>
      )}

      {!canRecord && (
        <div className="sap-due-passed">
          Assignment due date has passed. Recording is no longer available.
        </div>
      )}

      {/* Feedback section - only shown when there's a submission */}
      {hasSubmission ? (
        <div className="sap-feedback-section">
          <h3 className="sap-feedback-title">Your Speech Analysis</h3>

          {/* Video Playback */}
          {isCompleted && feedback?.videoUrl && (
            <div className="sap-feedback-card sap-video-card">
              <h4 className="sap-feedback-card-title">Your Recording</h4>
              <div className="sap-video-container">
                <video 
                  className="sap-video-player"
                  controls
                  src={feedback.videoUrl}
                  poster=""
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </div>
          )}

          {/* Grade Summary Card */}
          {isCompleted && gradeData && (
            <div className="sap-grade-summary">
              <div className="sap-grade-main">
                <div className="sap-grade-circle">
                  <span className="sap-grade-letter">{gradeData.letterGrade}</span>
                  <span className="sap-grade-score">{gradeData.totalScore}/100</span>
                </div>
                <div className="sap-grade-details">
                  <h4>Overall Grade</h4>
                  <div className="sap-grade-breakdown">
                    <div className="sap-grade-item">
                      <span className="sap-grade-item-label">Speech Content</span>
                      <span className="sap-grade-item-value">{gradeData.speechContentScore}/{gradeData.contentScoreMax}</span>
                      <div className="sap-grade-bar">
                        <div className="sap-grade-bar-fill" style={{width: `${(gradeData.speechContentScore / gradeData.contentScoreMax) * 100}%`}}></div>
                      </div>
                    </div>
                    <div className="sap-grade-item">
                      <span className="sap-grade-item-label">Filler Words</span>
                      <span className="sap-grade-item-value">{gradeData.fillerWordScore}/20</span>
                      <div className="sap-grade-bar">
                        <div className="sap-grade-bar-fill sap-grade-bar-gold" style={{width: `${(gradeData.fillerWordScore / 20) * 100}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <p className="sap-grade-formula">Final = 80% content + 20% filler words</p>
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div className="sap-feedback-card">
            <h4 className="sap-feedback-card-title">Speech Transcript</h4>
            <div className="sap-feedback-card-content">
              {isCompleted && feedback && feedback.transcript && feedback.transcript !== "No transcript available yet." ? (
                <p className="sap-transcript-text">{feedback.transcript}</p>
              ) : isProcessing ? (
                <p className="sap-processing-message">
                  🔄 Your speech is being analyzed... Check back in a few minutes!
                </p>
              ) : (
                <p className="sap-placeholder">Transcript processing...</p>
              )}
            </div>
            {isCompleted && feedback?.submittedAt && (
              <p className="sap-submission-time">
                Submitted: {new Date(feedback.submittedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Filler Words */}
          <div className="sap-feedback-card sap-filler-card">
            <h4 className="sap-feedback-card-title">Filler Words Analysis</h4>
            <div className="sap-feedback-card-content">
              {isCompleted && feedback ? (
                <div
                  className="sap-analysis-text"
                  dangerouslySetInnerHTML={{
                    __html: feedback.fillerWords
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .replace(/•/g, '&bull;')
                  }}
                />
              ) : isProcessing ? (
                <p className="sap-processing-message">🔄 Your speech is being analyzed... Check back in a few minutes!</p>
              ) : (
                <p className="sap-placeholder">Analysis pending...</p>
              )}
            </div>
          </div>

          {/* Speech Content */}
          <div className="sap-feedback-card">
            <h4 className="sap-feedback-card-title">Speech Content Analysis</h4>
            <div className="sap-feedback-card-content">
              {isCompleted && feedback ? (
                <div
                  className="sap-analysis-text"
                  dangerouslySetInnerHTML={{
                    __html: feedback.speechContent
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .replace(/•/g, '&bull;')
                  }}
                />
              ) : isProcessing ? (
                <p className="sap-processing-message">🔄 Your speech is being analyzed... Check back in a few minutes!</p>
              ) : (
                <p className="sap-placeholder">Analysis pending...</p>
              )}
            </div>
          </div>

          {/* Delivery & Language */}
          <div className="sap-feedback-card">
            <h4 className="sap-feedback-card-title">Delivery & Language Analysis</h4>
            <div className="sap-feedback-card-content">
              {isCompleted && feedback ? (
                <div className="sap-delivery-result">
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: feedback.bodyLanguage?.includes('✓') ? '#22c55e' : '#ef4444'
                  }}>
                    {feedback.bodyLanguage || '✗ Did not use hands effectively'}
                  </span>
                </div>
              ) : isProcessing ? (
                <p className="sap-processing-message">🔄 Your speech is being analyzed... Check back in a few minutes!</p>
              ) : (
                <p className="sap-placeholder">Analysis pending...</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Placeholder when no submission yet */
        <div className="sap-no-feedback">
          <div className="sap-no-feedback-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
            </svg>
          </div>
          <h3>Complete Your Recording to See AI Feedback</h3>
          <p>After you record and submit your speech, you'll receive detailed analysis on your content, filler words, and delivery.</p>
        </div>
      )}
    </div>
  )
}

export default StudentAssignmentPage
