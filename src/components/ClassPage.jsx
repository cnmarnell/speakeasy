import { useState, useEffect } from 'react'
import NewAssignmentModal from './NewAssignmentModal'
import { getAssignmentsByClass, getStudentsByClass, createAssignment, deleteAssignment } from '../data/supabaseData'
import { supabase } from '../lib/supabase'

function ClassPage({ className, onBack, onViewAssignment, onViewStudent }) {
  const [activeTab, setActiveTab] = useState('assignments')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [revealedStudentGrades, setRevealedStudentGrades] = useState({})
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [rubrics, setRubrics] = useState([])
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

        // Fetch rubrics for the dropdown
        const response = await supabase.functions.invoke('rubrics', {
          method: 'GET',
        })
        if (!response.error && response.data) {
          setRubrics(response.data)
        }
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
        dueDate: assignmentData.dueDate ? new Date(assignmentData.dueDate).toISOString() : null,
        rubricId: assignmentData.rubricId || null
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

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${assignmentTitle}"?\n\nThis will permanently delete:\n• The assignment\n• All student submissions\n• All grades and feedback\n\nThis action cannot be undone.`
    )

    if (!isConfirmed) {
      return
    }

    try {
      await deleteAssignment(assignmentId)
      
      // Refresh assignments list
      const updatedAssignments = await getAssignmentsByClass(className)
      setAssignments(updatedAssignments)
      
      alert('Assignment deleted successfully')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Failed to delete assignment. Please try again.')
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
      <div className="class-page-header">
        <div className="header-decorative-corner header-corner-left"></div>
        <div className="header-decorative-corner header-corner-right"></div>

        <div className="class-header-content">
          <div className="class-header-left">
            <div className="class-title-wrapper">
              <svg className="class-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <div>
                <h2 className="class-title">{className}</h2>
                <div className="class-subtitle-group">
                  <span className="subtitle-accent">●</span>
                  <p className="class-subtitle">Your Stage for Excellence</p>
                  <span className="subtitle-accent">●</span>
                </div>
              </div>
            </div>
          </div>
          <button className="new-assignment-btn" onClick={handleNewAssignment}>
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Assignment
          </button>
        </div>

        <div className="header-wave-accent"></div>
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
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-content" onClick={() => onViewAssignment(assignment)}>
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
                <button 
                  className="delete-assignment-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteAssignment(assignment.id, assignment.title)
                  }}
                  title="Delete Assignment"
                >
                  ×
                </button>
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
        rubrics={rubrics}
      />
    </div>
  )
}

export default ClassPage