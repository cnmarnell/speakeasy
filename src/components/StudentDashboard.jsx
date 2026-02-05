import React, { useState, useEffect } from 'react'
import { getAssignmentsForStudentInClass } from '../data/supabaseData'
import './StudentDashboard.css'

const StudentDashboard = ({ user, selectedClass, onAssignmentSelect, onBackToClasses }) => {
  const [assignments, setAssignments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, pending, completed, overdue

  useEffect(() => {
    if (selectedClass) {
      loadAssignments()
    }
  }, [user.id, selectedClass?.id])

  const loadAssignments = async () => {
    try {
      setIsLoading(true)
      const data = await getAssignmentsForStudentInClass(user.id, selectedClass.id)
      setAssignments(data || [])
    } catch (err) {
      setError('Failed to load assignments')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getAssignmentStatus = (assignment) => {
    if (assignment.status === 'completed') return 'completed'
    if (assignment.status === 'in_progress') return 'pending'
    if (!assignment.rawDueDate) return 'pending'
    
    const now = new Date()
    const dueDate = new Date(assignment.rawDueDate)
    
    if (now > dueDate) return 'overdue'
    return 'pending'
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-success">
            <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Completed
          </span>
        )
      case 'overdue':
        return (
          <span className="badge badge-danger">
            <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Overdue
          </span>
        )
      default:
        return (
          <span className="badge badge-warning">
            <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        )
    }
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  const filteredAssignments = assignments.filter(assignment => {
    const status = getAssignmentStatus(assignment)
    if (filter === 'all') return true
    return status === filter
  })

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => getAssignmentStatus(a) === 'pending').length,
    completed: assignments.filter(a => getAssignmentStatus(a) === 'completed').length,
    overdue: assignments.filter(a => getAssignmentStatus(a) === 'overdue').length
  }

  if (isLoading) {
    return (
      <div className="student-dashboard">
        <div className="dashboard-header">
          <h1>{selectedClass?.name || 'Assignments'}</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your assignments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="student-dashboard">
        <div className="dashboard-header">
          <h1>{selectedClass?.name || 'Assignments'}</h1>
        </div>
        <div className="error-container">
          <svg className="error-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAssignments}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>{selectedClass?.name || 'Assignments'}</h1>
            <p className="header-subtitle">
              {selectedClass?.description || 'Practice your speech and get AI feedback'}
              {selectedClass?.teacherName && ` • Taught by ${selectedClass.teacherName}`}
            </p>
          </div>
          <div className="header-actions">
            <div className="header-stats" data-tutorial="stats">
              <div className="stat-card">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-card stat-pending">
                <span className="stat-value">{stats.pending}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-card stat-completed">
                <span className="stat-value">{stats.completed}</span>
                <span className="stat-label">Completed</span>
              </div>
              {stats.overdue > 0 && (
                <div className="stat-card stat-overdue">
                  <span className="stat-value">{stats.overdue}</span>
                  <span className="stat-label">Overdue</span>
                </div>
              )}
            </div>
            <button 
              className="back-to-classes-btn"
              onClick={onBackToClasses}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/>
                <path d="m12 19-7-7 7-7"/>
              </svg>
              Back to Classes
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button 
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({stats.completed})
          </button>
          {stats.overdue > 0 && (
            <button 
              className={`filter-tab ${filter === 'overdue' ? 'active' : ''}`}
              onClick={() => setFilter('overdue')}
            >
              Overdue ({stats.overdue})
            </button>
          )}
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2>No {filter !== 'all' ? filter : ''} Assignments</h2>
            <p>
              {filter === 'all' 
                ? 'Assignments from your teacher will appear here'
                : `You have no ${filter} assignments`}
            </p>
          </div>
        ) : (
          <div className="assignments-list">
            {filteredAssignments.map((assignment, index) => {
              const status = getAssignmentStatus(assignment)
              return (
                <div
                  key={assignment.id}
                  className={`assignment-card status-${status}`}
                  onClick={() => onAssignmentSelect(assignment)}
                  style={{'--card-delay': `${index * 0.05}s`}}
                  {...(index === 0 ? { 'data-tutorial': 'assignment-card' } : {})}
                >
                  <div className="assignment-card-left">
                    <div className="assignment-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="assignment-info">
                      <h3 className="assignment-title">{assignment.title}</h3>
                      <div className="assignment-meta">
                        <span className="meta-item">
                          <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                          </svg>
                          {assignment.className}
                        </span>
                        {assignment.maxDuration && (
                          <span className="meta-item">
                            <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {assignment.maxDuration} min
                          </span>
                        )}
                        {assignment.rawDueDate && (
                          <span className="meta-item">
                            <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            {getDaysUntilDue(assignment.rawDueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="assignment-card-right">
                    {getStatusBadge(status)}
                    <svg className="assignment-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard