import { useState, useEffect } from 'react'
import { getStudentGradesById, getStudentProfile } from '../data/supabaseData'

function StudentDetailPage({ student, onBack }) {
  const [studentGrades, setStudentGrades] = useState([])
  const [loading, setLoading] = useState(true)

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
            <div key={assignment.id} className="assignment-grade-card">
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
    </div>
  )
}

export default StudentDetailPage