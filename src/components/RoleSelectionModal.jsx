import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import './RoleSelectionModal.css'

function RoleSelectionModal() {
  const { user, completeSignup } = useApp()
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectRole = async (role) => {
    setIsLoading(true)
    await completeSignup(role)
    setIsLoading(false)
  }

  return (
    <div className="role-modal-overlay">
      <div className="role-modal">
        <div className="role-modal-header">
          <h2>Welcome to Speakeasy!</h2>
          <p>How will you be using Speakeasy?</p>
        </div>
        
        <div className="role-modal-options">
          <button
            className="role-option role-option-student"
            onClick={() => handleSelectRole('student')}
            disabled={isLoading}
          >
            <div className="role-icon">🎓</div>
            <div className="role-info">
              <div className="role-title">I'm a Student</div>
              <div className="role-desc">Practice speeches and get AI feedback</div>
            </div>
          </button>
          
          <button
            className="role-option role-option-teacher"
            onClick={() => handleSelectRole('teacher')}
            disabled={isLoading}
          >
            <div className="role-icon">📚</div>
            <div className="role-info">
              <div className="role-title">I'm a Teacher</div>
              <div className="role-desc">Create assignments and track student progress</div>
            </div>
          </button>
        </div>

        {isLoading && (
          <div className="role-modal-loading">Setting up your account...</div>
        )}
      </div>
    </div>
  )
}

export default RoleSelectionModal
