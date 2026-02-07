import { useState, useEffect } from 'react'
import { getRubrics } from '../data/supabaseData'

function NewAssignmentModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    rubricId: ''
  })
  const [rubrics, setRubrics] = useState([])
  const [loadingRubrics, setLoadingRubrics] = useState(false)

  // Fetch rubrics when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchRubrics = async () => {
        setLoadingRubrics(true)
        try {
          const data = await getRubrics()
          setRubrics(data)
          // Auto-select first rubric if available
          if (data.length > 0 && !formData.rubricId) {
            setFormData(prev => ({ ...prev, rubricId: data[0].id }))
          }
        } catch (error) {
          console.error('Error fetching rubrics:', error)
        } finally {
          setLoadingRubrics(false)
        }
      }
      fetchRubrics()
    }
  }, [isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      rubricId: ''
    })
    onClose()
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      rubricId: ''
    })
    onClose()
  }

  // Get selected rubric details for preview
  const selectedRubric = rubrics.find(r => r.id === formData.rubricId)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">New Assignment</h2>
        
        <form onSubmit={handleSubmit} className="assignment-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rubricId" className="form-label">Grading Rubric</label>
            {loadingRubrics ? (
              <div className="rubric-loading">Loading rubrics...</div>
            ) : (
              <>
                <select
                  id="rubricId"
                  name="rubricId"
                  value={formData.rubricId}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="">Select a rubric...</option>
                  {rubrics.map(rubric => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} ({rubric.totalPoints} pts)
                    </option>
                  ))}
                </select>
                
                {/* Rubric preview */}
                {selectedRubric && (
                  <div className="rubric-preview">
                    <p className="rubric-description">{selectedRubric.description}</p>
                    <div className="rubric-criteria-list">
                      {selectedRubric.rubric_criteria?.map(criterion => (
                        <span key={criterion.id} className="criterion-tag">
                          {criterion.name} ({criterion.max_points}pt)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="startDate" className="form-label">Start Date</label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dueDate" className="form-label">Due Date</label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-buttons">
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewAssignmentModal
