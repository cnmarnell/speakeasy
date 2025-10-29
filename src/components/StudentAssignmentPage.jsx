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
        <h3 className="feedback-title">Feedback:</h3>
        
        <div className="feedback-categories">
          <div className="feedback-category">
            <h4 className="feedback-category-title">Filler Words</h4>
            <p className="feedback-content">
              {isCompleted && feedback ? feedback.fillerWords : "N/A"}
            </p>
          </div>

          <div className="feedback-category">
            <h4 className="feedback-category-title">Speech-Content</h4>
            <p className="feedback-content">
              {isCompleted && feedback ? feedback.speechContent : "N/A"}
            </p>
          </div>

          <div className="feedback-category">
            <h4 className="feedback-category-title">Body Language</h4>
            <p className="feedback-content">
              {isCompleted && feedback ? feedback.bodyLanguage : "N/A"}
            </p>
          </div>
        </div>
        
        <button className="record-btn" onClick={() => onViewRecording(assignment)}>
          Record
        </button>
      </div>

      <button className="back-btn" onClick={onBack}>
        Back to Dashboard
      </button>
    </div>
  )
}

export default StudentAssignmentPage