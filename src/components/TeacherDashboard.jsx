import React, { useState, useEffect } from 'react'
import { getClassesWithCodes, createClass, deleteClass } from '../data/supabaseData'
import ClassCreation from './ClassCreation'
import './TeacherDashboard.css'

const TeacherDashboard = ({ user, onClassSelect }) => {
  const [classes, setClasses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateClass, setShowCreateClass] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [user?.id])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      const data = await getClassesWithCodes(user.email)
      setClasses(data || [])
    } catch (err) {
      setError('Failed to load classes')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClass = async (classData) => {
    try {
      await createClass(classData, user.email)
      setShowCreateClass(false)
      await loadClasses() // Reload classes to show the new one
    } catch (error) {
      console.error('Error creating class:', error)
      throw error // Re-throw so ClassCreation component can handle it
    }
  }

  const handleDeleteClass = async (classId, className) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${className}"?\n\n` +
      `This will permanently delete:\n` +
      `• All assignments in this class\n` +
      `• All student submissions\n` +
      `• All grades and feedback\n` +
      `• All class enrollments\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setIsLoading(true)
      await deleteClass(classId)
      alert(`Class "${className}" has been deleted successfully.`)
      await loadClasses() // Reload classes to update the list
    } catch (error) {
      console.error('Error deleting class:', error)
      alert(`Failed to delete class: ${error.message}`)
      setIsLoading(false)
    }
  }

  const copyClassCode = async (classCode) => {
    try {
      await navigator.clipboard.writeText(classCode)
      // Could add a toast notification here
      alert(`Class code ${classCode} copied to clipboard!`)
    } catch (error) {
      console.error('Failed to copy class code:', error)
      // Fallback for browsers that don't support clipboard API
      prompt('Class code (copy with Ctrl+C):', classCode)
    }
  }

  const getClassGradient = (index) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    ]
    return gradients[index % gradients.length]
  }

  const getClassIcon = (index) => {
    const icons = [
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>,
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>,
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ]
    return icons[index % icons.length]
  }

  if (isLoading) {
    return (
      <div className="teacher-dashboard">
        <div className="dashboard-header">
          <h1>My Classes</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your classes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="teacher-dashboard">
        <div className="dashboard-header">
          <h1>My Classes</h1>
        </div>
        <div className="error-container">
          <svg className="error-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadClasses}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <div className="header-decorative-corner header-corner-left"></div>
        <div className="header-decorative-corner header-corner-right"></div>

        <div className="header-content">
          <div className="header-text">
            <div className="header-title-wrapper">
              <svg className="header-theater-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="6"/>
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
              <div>
                <h1>My Classes</h1>
                <div className="header-subtitle-group">
                  <span className="subtitle-accent">●</span>
                  <p className="header-subtitle">Direct Your Students to Excellence</p>
                  <span className="subtitle-accent">●</span>
                </div>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span className="stat-value">{classes.length}</span>
                <span className="stat-label">Total Theaters</span>
              </div>
            </div>
            <button
              className="create-class-btn"
              onClick={() => setShowCreateClass(true)}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Create New Class
            </button>
          </div>
        </div>

        <div className="header-wave-accent"></div>
      </div>

      <div className="container">
        {classes.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2>No Classes Yet</h2>
            <p>Classes assigned to you will appear here</p>
          </div>
        ) : (
          <div className="classes-grid">
            {classes.map((classItem, index) => (
              <div
                key={classItem.id}
                className="class-card"
                onClick={() => onClassSelect(classItem)}
                style={{'--card-delay': `${index * 0.1}s`}}
              >
                <div className="class-card-background" style={{background: getClassGradient(index)}}></div>
                <div className="class-card-content">
                  <button
                    className="delete-class-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClass(classItem.id, classItem.name)
                    }}
                    title="Delete class"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                  <div className="class-icon">
                    {getClassIcon(index)}
                  </div>
                  <h3 className="class-name">{classItem.name}</h3>
                  <div className="class-code-section">
                    <span className="class-code-label">Class Code:</span>
                    <button 
                      className="class-code-display"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyClassCode(classItem.classCode)
                      }}
                      title="Click to copy class code"
                    >
                      {classItem.classCode}
                      <svg className="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                  <div className="class-meta">
                    <span className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                      </svg>
                      {classItem.studentCount || 0} Students
                    </span>
                  </div>
                  <button className="enter-class-btn">
                    Enter Class
                    <svg className="btn-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Class Creation Modal */}
      {showCreateClass && (
        <ClassCreation 
          onCreateClass={handleCreateClass}
          onCancel={() => setShowCreateClass(false)}
        />
      )}
    </div>
  )
}

export default TeacherDashboard