import { useState, useEffect } from 'react'
import { getAssignmentById, getAssignmentFeedback, getStudentAssignmentStatus } from '../data/supabaseData'

function StudentAssignmentPage({ assignment, studentId, onBack, onViewRecording }) {
  const [assignmentData, setAssignmentData] = useState(null)
  const [studentStatus, setStudentStatus] = useState('Not Started')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!assignment?.id || !studentId) {
          setLoading(false)
          return
        }

        const [assignmentInfo, status, feedbackInfo] = await Promise.all([
          getAssignmentById(assignment.id),
          getStudentAssignmentStatus(studentId, assignment.id),
          getAssignmentFeedback(assignment.id, studentId)
        ])

        setAssignmentData(assignmentInfo)
        setStudentStatus(status)
        setFeedback(feedbackInfo)
      } catch (error) {
        console.error('Error fetching assignment data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assignment?.id, studentId])
  
  const isCompleted = studentStatus === "In Progress"
  
  // Check if assignment is still due (can re-record)
  const isDueDatePassed = assignmentData ? new Date() > new Date(assignmentData.rawDueDate) : false
  const canRecord = !isDueDatePassed

  if (loading) {
    return <div className="student-assignment-page">Loading...</div>
  }

  if (!assignmentData) {
    return (
      <div className="student-assignment-page">
        <h2>Assignment not found</h2>
        <button className="back-btn" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="student-assignment-page">
      <div className="student-assignment-header">
        <h2 className="student-assignment-title">{assignmentData.title}</h2>
        <p className="student-assignment-description">{assignmentData.description}</p>
      </div>

      <div className="feedback-section">
        <h3 className="feedback-title">Your Speech Analysis:</h3>
        
        {/* Transcript Section */}
        <div className="transcript-section">
          <div className="feedback-category transcript-category">
            <h4 className="feedback-category-title">Speech Transcript</h4>
            <div className="transcript-content">
              {isCompleted && feedback && feedback.transcript && feedback.transcript !== "No transcript available yet." ? (
                <p className="transcript-text">{feedback.transcript}</p>
              ) : (
                <p className="transcript-placeholder">
                  {isCompleted ? "Transcript processing..." : "Submit your speech to see the transcript"}
                </p>
              )}
            </div>
            {isCompleted && feedback?.submittedAt && (
              <p className="submission-timestamp">
                Submitted: {new Date(feedback.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Feedback Categories */}
        <div className="feedback-categories">
          <div className="feedback-category filler-words-category">
            <h4 className="feedback-category-title">Filler Words Analysis</h4>
            <div className="feedback-content filler-words-content">
              {isCompleted && feedback ? (
                <div
                  className="filler-analysis-text"
                  dangerouslySetInnerHTML={{
                    __html: feedback.fillerWords
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .replace(/•/g, '&bull;')
                  }}
                />
              ) : (
                <p className="no-feedback">N/A</p>
              )}
            </div>
          </div>

          <div className="feedback-category">
            <h4 className="feedback-category-title">Speech Content Analysis</h4>
            <div className="feedback-content speech-content">
              {isCompleted && feedback ? (
                <div
                  className="speech-analysis-text"
                  dangerouslySetInnerHTML={{
                    __html: feedback.speechContent
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .replace(/•/g, '&bull;')
                  }}
                />
              ) : (
                <p className="no-feedback">N/A</p>
              )}
            </div>
          </div>

          <div className="feedback-category">
            <h4 className="feedback-category-title">Delivery & Language Analysis</h4>
            <div className="feedback-content">
              {isCompleted && feedback ? (
                <div
                  className="delivery-analysis-text"
                  dangerouslySetInnerHTML={{
                    __html: feedback.bodyLanguage
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .replace(/•/g, '&bull;')
                  }}
                />
              ) : (
                <p className="no-feedback">N/A</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {canRecord && (
        <div className="record-button-container">
          <button className="record-btn" onClick={() => onViewRecording(assignment)}>
            {isCompleted ? "Re-record" : "Record"}
          </button>
        </div>
      )}
      
      {!canRecord && (
        <div className="record-button-container">
          <p className="due-date-passed">Assignment due date has passed. Recording is no longer available.</p>
        </div>
      )}

      <button className="back-btn" onClick={onBack}>
        Back to Dashboard
      </button>
    </div>
  )
}

export default StudentAssignmentPage