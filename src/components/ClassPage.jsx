import { useState, useEffect } from 'react'
import NewAssignmentModal from './NewAssignmentModal'
import { getAssignmentsByClass, getStudentsByClass, createAssignment, deleteAssignment, removeStudentFromClass } from '../data/supabaseData'

function ClassPage({ className, onBack, onViewAssignment, onViewStudent }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
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
      
      const updatedAssignments = await getAssignmentsByClass(className)
      setAssignments(updatedAssignments)
      
      alert('Assignment deleted successfully')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Failed to delete assignment. Please try again.')
    }
  }

  const handleRemoveStudent = async (studentId, studentName) => {
    const isConfirmed = window.confirm(
      `Remove "${studentName}" from ${className}?\n\nThis will also delete all their submissions and grades for this class.\n\nThis action cannot be undone.`
    )

    if (!isConfirmed) return

    try {
      await removeStudentFromClass(studentId, className)
      const updatedStudents = await getStudentsByClass(className)
      setStudents(updatedStudents)
      alert(`${studentName} has been removed from the class.`)
    } catch (error) {
      console.error('Error removing student:', error)
      alert('Failed to remove student. Please try again.')
    }
  }

  // Compute class stats
  const totalStudents = students.length
  const totalAssignments = assignments.length
  const avgScore = students.length > 0
    ? Math.round(
        students.reduce((sum, s) => {
          const grade = parseFloat(s.overallGrade)
          return sum + (isNaN(grade) ? 0 : grade)
        }, 0) / students.filter(s => !isNaN(parseFloat(s.overallGrade))).length || 0
      )
    : 0
  const pendingReview = students.reduce((sum, s) => {
    const count = parseInt(s.submissionCount)
    return sum + (isNaN(count) ? 0 : count)
  }, 0)

  const getAssignmentStatusClass = (assignment) => {
    const status = assignment.status?.toLowerCase()
    if (status === 'active') return 'cp-status-active'
    if (status === 'past due' || status === 'past_due' || status === 'overdue') return 'cp-status-pastdue'
    if (status === 'draft') return 'cp-status-draft'
    if (status === 'graded') return 'cp-status-graded'
    return 'cp-status-active'
  }

  if (loading) {
    return (
      <div className="class-page">
        <div className="cp-loading">
          <div className="cp-spinner"></div>
          <p>Loading class data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="class-page">
      {/* Header */}
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
                  <p className="class-subtitle">Class Dashboard</p>
                  <span className="subtitle-accent">●</span>
                </div>
              </div>
            </div>
          </div>
          <div className="cp-header-actions">
            <button className="new-assignment-btn" onClick={handleNewAssignment}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Assignment
            </button>
            <button className="cp-back-btn-header" onClick={onBack}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Dashboard
            </button>
          </div>
        </div>

        <div className="header-wave-accent"></div>
      </div>

      {/* Stats Overview */}
      <div className="cp-stats-bar">
        <div className="cp-stat-item">
          <div className="cp-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="cp-stat-value">{totalStudents}</span>
          <span className="cp-stat-label">Students</span>
        </div>
        <div className="cp-stat-item">
          <div className="cp-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span className="cp-stat-value">{totalAssignments}</span>
          <span className="cp-stat-label">Assignments</span>
        </div>
        <div className="cp-stat-item">
          <div className="cp-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <span className="cp-stat-value">{avgScore}%</span>
          <span className="cp-stat-label">Avg Score</span>
        </div>
        <div className="cp-stat-item">
          <div className="cp-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span className="cp-stat-value">{pendingReview}</span>
          <span className="cp-stat-label">Submissions</span>
        </div>
      </div>

      {/* Main Content: Two-column layout */}
      <div className="cp-dashboard-content">
        {/* Assignments Section (Main/Left) */}
        <div className="cp-assignments-section">
          <div className="cp-section-header">
            <h3 className="cp-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cp-section-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Assignments
            </h3>
            <span className="cp-section-count">{assignments.length}</span>
          </div>

          {assignments.length === 0 ? (
            <div className="cp-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="cp-empty-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="12" x2="12" y2="18"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <p>No assignments yet. Click "New Assignment" to create one.</p>
            </div>
          ) : (
            <div className="cp-assignments-list">
              {assignments.map(assignment => (
                <div
                  key={assignment.id}
                  className={`cp-assignment-card ${getAssignmentStatusClass(assignment)}`}
                  onClick={() => onViewAssignment(assignment)}
                >
                  <div className="cp-assignment-card-left">
                    <div className="cp-assignment-status-dot"></div>
                    <div className="cp-assignment-info">
                      <h4 className="cp-assignment-title">{assignment.title}</h4>
                      {assignment.description && (
                        <p className="cp-assignment-desc">
                          {assignment.description.length > 100
                            ? assignment.description.substring(0, 100) + '...'
                            : assignment.description}
                        </p>
                      )}
                      <div className="cp-assignment-meta">
                        <span className={`cp-assignment-status-badge ${getAssignmentStatusClass(assignment)}`}>
                          {assignment.status}
                        </span>
                        <span className="cp-assignment-due">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cp-meta-icon">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {assignment.dueDate || 'No due date'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="cp-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAssignment(assignment.id, assignment.title)
                    }}
                    title="Delete Assignment"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students Sidebar (Right) */}
        <div className="cp-students-section">
          <div className="cp-section-header">
            <h3 className="cp-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cp-section-icon">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Student Roster
            </h3>
            <span className="cp-section-count">{students.length}</span>
          </div>

          {students.length === 0 ? (
            <div className="cp-empty-state cp-empty-state-small">
              <p>No students enrolled yet.</p>
            </div>
          ) : (
            <div className="cp-students-list">
              {students.map(student => (
                <div
                  key={student.id}
                  className="cp-student-row"
                  onClick={() => onViewStudent(student)}
                >
                  <div className="cp-student-avatar">
                    {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="cp-student-info">
                    <span className="cp-student-name">{student.name}</span>
                    <span className="cp-student-email">{student.email}</span>
                  </div>
                  <div className="cp-student-stats">
                    <span className="cp-student-grade">{student.overallGrade || 'N/A'}</span>
                    <span className="cp-student-submissions">{student.submissionCount || 0} submitted</span>
                  </div>
                  <button
                    className="cp-remove-student-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveStudent(student.id, student.name)
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewAssignmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitAssignment}
      />
    </div>
  )
}

export default ClassPage
