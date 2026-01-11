import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './RubricsPage.css'

const RubricsPage = ({ user, onBack, onEditRubric, onCreateRubric }) => {
  const [rubrics, setRubrics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRubrics()
  }, [user?.email])

  const loadRubrics = async () => {
    try {
      setIsLoading(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      const response = await supabase.functions.invoke('rubrics', {
        method: 'GET',
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch rubrics')
      }

      setRubrics(response.data || [])
    } catch (err) {
      setError('Failed to load rubrics')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRubric = async (rubricId, rubricName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${rubricName}"?\n\n` +
      `This will permanently delete the rubric and all its criteria.\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setIsLoading(true)

      const response = await supabase.functions.invoke(`rubrics/${rubricId}`, {
        method: 'DELETE',
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete rubric')
      }

      alert(`Rubric "${rubricName}" has been deleted successfully.`)
      await loadRubrics()
    } catch (error) {
      console.error('Error deleting rubric:', error)
      alert(`Failed to delete rubric: ${error.message}`)
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getRubricGradient = (index) => {
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

  if (isLoading) {
    return (
      <div className="rubrics-page">
        <div className="rubrics-header">
          <div className="header-content">
            <button className="back-button" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Dashboard
            </button>
            <h1>My Rubrics</h1>
          </div>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your rubrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rubrics-page">
        <div className="rubrics-header">
          <div className="header-content">
            <button className="back-button" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Dashboard
            </button>
            <h1>My Rubrics</h1>
          </div>
        </div>
        <div className="error-container">
          <svg className="error-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadRubrics}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rubrics-page">
      <div className="rubrics-header">
        <div className="header-decorative-corner header-corner-left"></div>
        <div className="header-decorative-corner header-corner-right"></div>

        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Dashboard
            </button>
            <div className="header-title-wrapper">
              <svg className="header-rubric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6"/>
                <path d="M9 16h6"/>
              </svg>
              <div>
                <h1>My Rubrics</h1>
                <p className="header-subtitle">Evaluation Criteria Templates</p>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                </div>
                <span className="stat-value">{rubrics.length}</span>
                <span className="stat-label">Total Rubrics</span>
              </div>
            </div>
            <button className="create-rubric-btn" onClick={onCreateRubric}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Create Rubric
            </button>
          </div>
        </div>

        <div className="header-wave-accent"></div>
      </div>

      <div className="container">
        {rubrics.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6"/>
              <path d="M9 16h6"/>
            </svg>
            <h2>No Rubrics Yet</h2>
            <p>Create your first rubric to start evaluating student performances</p>
            <button className="btn btn-primary create-first-btn" onClick={onCreateRubric}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Create Your First Rubric
            </button>
          </div>
        ) : (
          <div className="rubrics-grid">
            {rubrics.map((rubric, index) => (
              <div
                key={rubric.id}
                className="rubric-card"
                style={{'--card-delay': `${index * 0.1}s`}}
              >
                <div className="rubric-card-background" style={{background: getRubricGradient(index)}}></div>
                <div className="rubric-card-content">
                  <div className="rubric-card-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditRubric(rubric)
                      }}
                      title="Edit rubric"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRubric(rubric.id, rubric.name)
                      }}
                      title="Delete rubric"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                  <div className="rubric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                    </svg>
                  </div>
                  <h3 className="rubric-name">{rubric.name}</h3>
                  {rubric.description && (
                    <p className="rubric-description">{rubric.description}</p>
                  )}
                  <div className="rubric-meta">
                    <span className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6"/>
                        <path d="M9 16h6"/>
                        <path d="M9 8h6"/>
                      </svg>
                      {rubric.criteria?.length || 0} Criteria
                    </span>
                    <span className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatDate(rubric.created_at)}
                    </span>
                  </div>
                  <div className="rubric-total-points">
                    <span className="total-label">Max Score:</span>
                    <span className="total-value">
                      {rubric.criteria?.reduce((sum, c) => sum + (c.max_points || 0), 0) || 0} pts
                    </span>
                  </div>
                  <button 
                    className="view-rubric-btn"
                    onClick={() => onEditRubric(rubric)}
                  >
                    View & Edit
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
    </div>
  )
}

export default RubricsPage
