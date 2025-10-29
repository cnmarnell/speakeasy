import { useState, useEffect } from 'react'
import NewAssignmentModal from './NewAssignmentModal'
import { getAssignmentsByClass, getStudentsByClass, createAssignment } from '../data/supabaseData'

function ClassPage({ className, onBack, onViewAssignment, onViewStudent }) {
  const [activeTab, setActiveTab] = useState('assignments')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [revealedStudentGrades, setRevealedStudentGrades] = useState({})
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentData, studentData] = await Promise.all([
          getAssignmentsByClass(className),
          getStudentsByClass(className)
        ])
        setAssignments(assignmentData)
        setStudents(studentData)
      } catch (error) {
        console.error('Error fetching class data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [className])

  const handleNewAssignment = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmitAssignment = async (assignmentData) => {
    try {
      const newAssignment = await createAssignment({
        ...assignmentData,
        className: className,
        dueDate: assignmentData.dueDate ? new Date(assignmentData.dueDate).toISOString() : null
      })
      
      console.log('New assignment created:', newAssignment)
      
      // Refresh assignments list
      const updatedAssignments = await getAssignmentsByClass(className)
      setAssignments(updatedAssignments)
      
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert('Failed to create assignment. Please try again.')
    }
  }

  const toggleStudentGradeReveal = (studentId) => {
    setRevealedStudentGrades(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }))
  }

  if (loading) {
    return <div className="class-page">Loading...</div>
  }

  return (
    <div className="class-page">
      <div className="class-header">
        <h2 className="class-title">{className}</h2>
        <button className="new-assignment-btn" onClick={handleNewAssignment}>New Assignment</button>
      </div>
      
      <div className="class-tabs">
        <button 
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button 
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Students
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'assignments' && (
          <div className="assignments-tab">
            {assignments.map(assignment => (
              <div key={assignment.id} className="assignment-card" onClick={() => onViewAssignment(assignment)}>
                <div className="assignment-info">
                  <h3 className="assignment-title">{assignment.title}</h3>
                  <p className="assignment-description">{assignment.description}</p>
                </div>
                <div className="assignment-details">
                  <span className={`assignment-status ${assignment.status.toLowerCase()}`}>
                    {assignment.status}
                  </span>
                  <span className="assignment-due">Due: {assignment.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-tab">
            {students.map(student => (
              <div key={student.id} className="student-card">
                <div className="student-info" onClick={() => onViewStudent(student)}>
                  <h3 className="student-name">{student.name}</h3>
                  <p className="student-email">{student.email}</p>
                </div>
                <div className="student-details">
                  <span className="student-activity">Last active: {student.lastActivity}</span>
                  <div className="student-grade-section">
                    <button 
                      className="student-grade-reveal-btn"
                      onClick={() => toggleStudentGradeReveal(student.id)}
                    >
                      {revealedStudentGrades[student.id] ? "Hide Grade" : "Show Grade"}
                    </button>
                    {revealedStudentGrades[student.id] && (
                      <div className="student-overall-grade">
                        <span>Overall: {student.overallGrade} ({student.totalPoints})</span>
                        <span className="submission-count">{student.submissionCount} submissions</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="back-btn" onClick={onBack}>
        Back to Dashboard
      </button>

      <NewAssignmentModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitAssignment}
      />
    </div>
  )
}

export default ClassPage