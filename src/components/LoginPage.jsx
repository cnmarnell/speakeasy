import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { createUserProfile } from '../data/supabaseData'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e, accountType = null) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let result
      if (isSignUp && accountType) {
        // Sign up flow - create auth user first
        result = await supabase.auth.signUp({
          email,
          password,
        })

        if (result.error) {
          throw result.error
        }

        // Create profile in students or teachers table
        await createUserProfile(email, name, accountType)

        if (result.data.user) {
          onLogin(result.data.user, accountType)
        }
      } else {
        // Sign in flow
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (result.error) {
          throw result.error
        }

        if (result.data.user) {
          onLogin(result.data.user)
        }
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-stage-left"></div>
      <div className="login-stage-right"></div>

      <div className="login-spotlight"></div>

      <div className="login-container">
        <div className="login-header">
          <div className="microphone-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h1 className="login-title">Speakeasy</h1>
          <p className="login-tagline">Find Your Voice</p>
        </div>

        <div className="login-divider"></div>

        <p className="login-subtitle">
          {isSignUp ? 'Take the Stage' : 'Welcome Back'}
        </p>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Your Name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          {isSignUp ? (
            <div className="signup-buttons">
              <button
                type="button"
                className="login-button signup-student"
                disabled={isLoading}
                onClick={(e) => handleSubmit(e, 'student')}
              >
                <span className="button-text">
                  {isLoading ? 'Please Wait...' : 'Sign up as Student'}
                </span>
              </button>
              <button
                type="button"
                className="login-button signup-teacher"
                disabled={isLoading}
                onClick={(e) => handleSubmit(e, 'teacher')}
              >
                <span className="button-text">
                  {isLoading ? 'Please Wait...' : 'Sign up as Teacher'}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              <span className="button-text">
                {isLoading ? 'Please Wait...' : 'Enter'}
              </span>
              <span className="button-arrow">→</span>
            </button>
          )}
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="toggle-mode-button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
          >
            {isSignUp ? 'Already performing? Sign in' : "New here? Join the stage"}
          </button>
        </div>
      </div>

      <div className="login-decoration">
        <div className="deco-circle"></div>
        <div className="deco-circle"></div>
        <div className="deco-circle"></div>
      </div>
    </div>
  )
}

export default LoginPage