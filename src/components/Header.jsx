import { useTutorial } from '../contexts/TutorialContext'

function Header({ user, userRole, onLogout }) {
  // Tutorial hook - will be null for teachers since TutorialProvider only wraps students
  let tutorial = null
  try {
    tutorial = useTutorial()
  } catch (e) {
    // Not in TutorialProvider context (teacher view)
  }

  return (
    <header className="header-banner">
      <div className="header-content">
        <div className="header-logo">
          <div className="header-mic-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div className="header-title-group">
            <h1 className="header-title">Speakeasy</h1>
            <span className="header-tagline">Find Your Voice</span>
          </div>
        </div>
        {user && (
          <div className="header-user-info">
            {tutorial && userRole === 'student' && (
              <button 
                className="tutorial-replay-button" 
                onClick={tutorial.restartTutorial}
                title="Replay Tutorial"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <span>Help</span>
              </button>
            )}
            <div className="user-details">
              <span className="user-email">{user.email}</span>
              <span className="user-role">{userRole === 'teacher' ? 'Instructor' : 'Student'}</span>
            </div>
            <button className="logout-button" onClick={onLogout}>
              <span>Exit Stage</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="header-accent"></div>
    </header>
  )
}

export default Header