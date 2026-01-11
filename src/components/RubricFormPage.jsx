import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import './RubricFormPage.css'

const RubricFormPage = ({ user, rubric, onBack, onSave }) => {
  const isEditing = !!rubric

  const [name, setName] = useState(rubric?.name || '')
  const [description, setDescription] = useState(rubric?.description || '')
  const [criteria, setCriteria] = useState(
    rubric?.criteria?.length > 0
      ? rubric.criteria.map((c, idx) => ({
          id: c.id || `temp-${idx}`,
          name: c.name,
          description: c.description || '',
          max_points: c.max_points,
          order: c.order ?? idx
        }))
      : [{ id: 'temp-0', name: '', description: '', max_points: 1, order: 0 }]
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAddCriterion = () => {
    const newOrder = criteria.length
    setCriteria([
      ...criteria,
      { id: `temp-${Date.now()}`, name: '', description: '', max_points: 1, order: newOrder }
    ])
  }

  const handleRemoveCriterion = (index) => {
    if (criteria.length <= 1) {
      setError('Rubric must have at least one criterion')
      return
    }
    const newCriteria = criteria.filter((_, i) => i !== index)
    // Reorder after removal
    setCriteria(newCriteria.map((c, i) => ({ ...c, order: i })))
    setError('')
  }

  const handleCriterionChange = (index, field, value) => {
    const newCriteria = [...criteria]
    newCriteria[index] = { ...newCriteria[index], [field]: value }
    setCriteria(newCriteria)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name.trim()) {
      setError('Rubric name is required')
      return
    }

    if (criteria.length === 0) {
      setError('Rubric must have at least one criterion')
      return
    }

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim()) {
        setError(`Criterion ${i + 1} must have a name`)
        return
      }
      if (criteria[i].max_points < 1) {
        setError(`Criterion "${criteria[i].name}" must have at least 1 point`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        criteria: criteria.map((c, idx) => ({
          name: c.name.trim(),
          description: c.description?.trim() || null,
          max_points: parseInt(c.max_points, 10),
          order: idx
        }))
      }

      let response
      if (isEditing) {
        response = await supabase.functions.invoke(`rubrics/${rubric.id}`, {
          method: 'PUT',
          body: payload
        })
      } else {
        response = await supabase.functions.invoke('rubrics', {
          method: 'POST',
          body: payload
        })
      }

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save rubric')
      }

      alert(`Rubric ${isEditing ? 'updated' : 'created'} successfully!`)

      if (onSave) {
        onSave(response.data)
      } else {
        onBack()
      }
    } catch (err) {
      console.error('Error saving rubric:', err)
      setError(err.message || 'Failed to save rubric. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalMaxPoints = criteria.reduce((sum, c) => sum + (parseInt(c.max_points, 10) || 0), 0)

  return (
    <div className="rubric-form-page">
      <div className="rubric-form-header">
        <div className="header-decorative-corner header-corner-left"></div>
        <div className="header-decorative-corner header-corner-right"></div>

        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Rubrics
            </button>
            <div className="header-title-wrapper">
              <svg className="header-rubric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6"/>
                <path d="M9 16h6"/>
              </svg>
              <div>
                <h1>{isEditing ? 'Edit Rubric' : 'Create Rubric'}</h1>
                <p className="header-subtitle">
                  {isEditing ? 'Modify evaluation criteria' : 'Define evaluation criteria'}
                </p>
              </div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6"/>
                  <path d="M9 16h6"/>
                  <path d="M9 8h6"/>
                </svg>
              </div>
              <span className="stat-value">{criteria.length}</span>
              <span className="stat-label">Criteria</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span className="stat-value">{totalMaxPoints}</span>
              <span className="stat-label">Max Points</span>
            </div>
          </div>
        </div>

        <div className="header-wave-accent"></div>
      </div>

      <div className="container">
        <form onSubmit={handleSubmit} className="rubric-form">
          {error && (
            <div className="form-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="form-section">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Basic Information
            </h2>

            <div className="form-group">
              <label htmlFor="rubric-name">Rubric Name *</label>
              <input
                id="rubric-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CAR Framework, STAR Method"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="rubric-description">Description</label>
              <textarea
                id="rubric-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rubric evaluates and when to use it..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-section criteria-section">
            <div className="section-header">
              <h2 className="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6"/>
                  <path d="M9 16h6"/>
                </svg>
                Evaluation Criteria
              </h2>
              <button
                type="button"
                className="add-criterion-btn"
                onClick={handleAddCriterion}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Criterion
              </button>
            </div>

            <div className="criteria-list">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="criterion-card">
                  <div className="criterion-header">
                    <span className="criterion-number">Criterion {index + 1}</span>
                    <button
                      type="button"
                      className="remove-criterion-btn"
                      onClick={() => handleRemoveCriterion(index)}
                      disabled={criteria.length <= 1}
                      title={criteria.length <= 1 ? 'Rubric must have at least one criterion' : 'Remove criterion'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>

                  <div className="criterion-fields">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                        placeholder="e.g., Context, Action, Result"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={criterion.description}
                        onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                        placeholder="What should be evaluated for this criterion..."
                        rows={2}
                      />
                    </div>

                    <div className="form-group max-points-group">
                      <label>Max Points *</label>
                      <select
                        value={criterion.max_points}
                        onChange={(e) => handleCriterionChange(index, 'max_points', parseInt(e.target.value, 10))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>{n} point{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-small"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {isEditing ? 'Update Rubric' : 'Create Rubric'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RubricFormPage
