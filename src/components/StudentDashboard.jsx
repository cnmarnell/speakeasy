import { useState, useEffect } from 'react'
import { getAssignmentsForStudent, getStudentProfile } from '../data/supabaseData'

function StudentDashboard({ studentId, onViewStudentAssignment }) {
  const [studentAssignments, setStudentAssignments] = useState([])
  const [studentProfile, setStudentProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignments, profile] = await Promise.all([
          getAssignmentsForStudent(studentId),
          getStudentProfile(studentId)
        ])
        setStudentAssignments(assignments)
        setStudentProfile(profile)
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchData()
      
      // Set up periodic refresh every 30 seconds to catch new assignments
      const interval = setInterval(() => {
        getAssignmentsForStudent(studentId).then(setStudentAssignments)
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [studentId])

  if (loading) {
    return <div className="student-dashboard">Loading...</div>
  }

  return (
    <div className="student-dashboard">
      <div className="student-header">
        <h2 className="dashboard-title">Student Dashboard</h2>
        {studentProfile && (
          <div className="student-info">
            <h3>{studentProfile.name}</h3>
            <p>Primary Class: {studentProfile.primaryClass}</p>
            <p>Teacher: {studentProfile.primaryTeacher}</p>
          </div>
        )}
      </div>
      <div className="todo-section">
      <h3 className="todo-title">To-Do:</h3>
        {studentAssignments.map((assignment, index) => (
          <div key={assignment.id}>
            <div className="assignment-item">
              <div className="assignment-content" onClick={() => onViewStudentAssignment(assignment)}>
                <div className="assignment-text">
                  <h4 className="assignment-main">{assignment.title}</h4>
                  <p className="assignment-sub">{assignment.description}</p>
                  <p className="assignment-class">Class: {assignment.className}</p>
                </div>
                <div className="assignment-status">
                  <span className="status-text">{assignment.status}</span>
                  <span className="due-date">Due: {assignment.dueDate}</span>
                </div>
              </div>
            </div>
            {index < studentAssignments.length - 1 && <hr className="assignment-divider" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StudentDashboard