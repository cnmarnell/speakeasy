import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import './FeedbackButton.css'

function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const location = useLocation()
  const { user, userRole } = useApp()

  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'
    
    const isMobile = /Mobile|Android|iPhone/i.test(ua)
    return `${browser} (${isMobile ? 'Mobile' : 'Desktop'})`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return

    setIsSubmitting(true)

    const reportData = {
      description: description.trim(),
      pageUrl: window.location.href,
      pagePath: location.pathname,
      userEmail: user?.email || 'Not logged in',
      userRole: userRole || 'Unknown',
      browser: getBrowserInfo(),
      timestamp: new Date().toISOString(),
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    }

    try {
      // Send to Supabase
      const { error } = await supabase
        .from('feedback_reports')
        .insert([{
          description: reportData.description,
          page_url: reportData.pageUrl,
          page_path: reportData.pagePath,
          user_email: reportData.userEmail,
          user_role: reportData.userRole,
          browser: reportData.browser,
          screen_size: reportData.screenSize
        }])

      if (error) throw error

      console.log('Bug Report Submitted:', reportData)
      
      setSubmitted(true)
      setDescription('')
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
      }, 2000)

    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        className="feedback-floating-btn"
        onClick={() => setIsOpen(true)}
        title="Report an issue"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span>Report Issue</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <button className="feedback-close" onClick={() => setIsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {submitted ? (
              <div className="feedback-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Thanks for the feedback!</h3>
                <p>We'll look into it.</p>
              </div>
            ) : (
              <>
                <h2 className="feedback-title">Report an Issue</h2>
                <p className="feedback-subtitle">Found a bug or something not working? Let us know!</p>
                
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="feedback-textarea"
                    placeholder="What went wrong? Be as specific as you can..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  
                  <div className="feedback-meta">
                    <span>📍 {location.pathname}</span>
                    <span>👤 {userRole || 'Guest'}</span>
                  </div>

                  <button 
                    type="submit" 
                    className="feedback-submit"
                    disabled={isSubmitting || !description.trim()}
                  >
                    {isSubmitting ? 'Sending...' : 'Submit Report'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackButton
