function Header({ user, userRole, onLogout }) {
  return (
    <header className="header-banner">
      <h1 className="header-title">SpeakEasy</h1>
      {user && (
        <div className="header-user-info">
          <span className="user-email">{user.email}</span>
          <span className="user-role">({userRole})</span>
          <button className="logout-button" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}

export default Header