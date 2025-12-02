import { useState } from 'react'

function JoinClass({ onJoinClass, onCancel }) {
  const [classCode, setClassCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const trimmedCode = classCode.trim().toUpperCase()
    if (!trimmedCode) {
      setError('Please enter a class code')
      return
    }

    if (trimmedCode.length !== 8) {
      setError('Class code must be 8 characters')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await onJoinClass(trimmedCode)
      if (result.success) {
        setSuccess(`Successfully joined class: ${result.className}`)
        setTimeout(() => {
          onCancel() // Close modal after success
        }, 2000)
      }
    } catch (error) {
      console.error('Error joining class:', error)
      if (error.message.includes('already enrolled')) {
        setError('You are already enrolled in this class')
      } else if (error.message.includes('not found')) {
        setError('Invalid class code. Please check and try again.')
      } else {
        setError('Failed to join class. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCodeChange = (e) => {
    // Auto-format to uppercase and limit to 8 characters
    const value = e.target.value.toUpperCase().slice(0, 8)
    setClassCode(value)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content join-class-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Class</h2>
          <button className="close-modal-btn" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="join-class-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="classCode">Class Code</label>
            <input
              type="text"
              id="classCode"
              value={classCode}
              onChange={handleCodeChange}
              placeholder="Enter 8-character class code"
              maxLength="8"
              required
              disabled={isSubmitting}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '1.2rem', 
                textAlign: 'center',
                letterSpacing: '2px'
              }}
            />
            <p className="input-help">
              Ask your teacher for the 8-character class code
            </p>
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
              disabled={isSubmitting || classCode.length !== 8}
            >
              {isSubmitting ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JoinClass