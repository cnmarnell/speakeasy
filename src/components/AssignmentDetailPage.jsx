import { useState, useEffect } from 'react'
import { getStudentProgressForAssignment } from '../data/supabaseData'

function AssignmentDetailPage({ assignment, onBack, onViewStudent }) {
  const [revealedStudentGrades, setRevealedStudentGrades] = useState({})
  const [studentProgressData, setStudentProgressData] = useState([])
  const [loading, setLoading] = useState(true)

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
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="back-btn" onClick={onBack}>
        Back to Class
      </button>
    </div>
  )
}

export default AssignmentDetailPage