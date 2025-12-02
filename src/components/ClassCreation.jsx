import { useState } from 'react'

function ClassCreation({ onCreateClass, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('Class name is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onCreateClass(formData)
    } catch (error) {
      console.error('Error creating class:', error)
      setError('Failed to create class. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content class-creation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Class</h2>
          <button className="close-modal-btn" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="class-creation-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="className">Class Name *</label>
            <input
              type="text"
              id="className"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Public Speaking 101"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="classDescription">Description</label>
            <textarea
              id="classDescription"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the class (optional)"
              rows="3"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClassCreation