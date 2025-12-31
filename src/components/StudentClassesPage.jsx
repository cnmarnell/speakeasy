import React, { useState, useEffect } from 'react'
import { getEnrolledClasses, joinClassByCode } from '../data/supabaseData'
import JoinClass from './JoinClass'
import './StudentDashboard.css'

const StudentClassesPage = ({ user, onClassSelect }) => {
  const [classes, setClasses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showJoinClass, setShowJoinClass] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [user.email])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      const data = await getEnrolledClasses(user.email)
      setClasses(data || [])
    } catch (err) {
      setError('Failed to load classes')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinClass = async (classCode) => {
    try {
      const result = await joinClassByCode(classCode, user.email)
      setShowJoinClass(false)
      await loadClasses() // Reload classes to show the newly joined class
      return result
    } catch (error) {
      console.error('Error joining class:', error)
      throw error // Re-throw so JoinClass component can handle it
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
      <div className="student-dashboard">
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
      <div className="student-dashboard">
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
    <div className="student-dashboard">
      <div className="dashboard-header">
        <div className="header-decorative-corner header-corner-left"></div>
        <div className="header-decorative-corner header-corner-right"></div>

        <div className="header-content">
          <div className="header-text">
            <div className="header-title-wrapper">
              <svg className="header-theater-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
                <line x1="2" y1="20" x2="2.01" y2="20"/>
              </svg>
              <div>
                <h1>My Classes</h1>
                <div className="header-subtitle-group">
                  <span className="subtitle-accent">●</span>
                  <p className="header-subtitle">Your Performance Stage Awaits</p>
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
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="stat-value">{classes.length}</span>
                <span className="stat-label">Active Stages</span>
              </div>
            </div>
            <button
              className="join-class-btn"
              onClick={() => setShowJoinClass(true)}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="m22 2-5 5"/>
                <path d="m17 2 5 5"/>
              </svg>
              Join New Class
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
            <p>Join a class using the class code from your teacher</p>
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
                  <div className="class-icon">
                    {getClassIcon(index)}
                  </div>
                  <h3 className="class-name">{classItem.name}</h3>
                  {classItem.description && (
                    <p className="class-description">{classItem.description}</p>
                  )}
                  <div className="class-meta">
                    <span className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                      </svg>
                      {classItem.teacherName}
                    </span>
                    <span className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Joined {new Date(classItem.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="enter-class-btn">
                    View Assignments
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
      
      {/* Join Class Modal */}
      {showJoinClass && (
        <JoinClass 
          onJoinClass={handleJoinClass}
          onCancel={() => setShowJoinClass(false)}
        />
      )}
    </div>
  )
}

export default StudentClassesPage