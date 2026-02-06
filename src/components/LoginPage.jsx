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

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      })

      if (error) {
        throw error
      }
      // Supabase handles the redirect
      // New users will see role selection modal after OAuth
    } catch (error) {
      setError(error.message)
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

        <div className="login-divider-text">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-signin-button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

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