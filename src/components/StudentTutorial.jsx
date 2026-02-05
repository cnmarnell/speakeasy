import React, { useState, useEffect } from 'react'
import './StudentTutorial.css'

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Speakeasy! 🎤',
    description: 'Master your communication skills with AI-powered feedback. Let\'s take a quick tour to get you started.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
    highlight: null
  },
  {
    id: 'classes',
    title: 'Your Classes',
    description: 'This is your classes page. You\'ve been automatically enrolled in "Career Practice" — a class designed to help you practice real-world scenarios.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    highlight: 'classes-grid'
  },
  {
    id: 'assignments',
    title: 'View Assignments',
    description: 'Click on a class card to see your assignments. Each assignment is a speaking exercise with specific goals and a time limit.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    highlight: 'class-card'
  },
  {
    id: 'recording',
    title: 'Record Your Practice',
    description: 'When you\'re ready, hit record! Our AI will analyze your speech for content, delivery, and filler words — then give you personalized feedback.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    ),
    highlight: null
  },
  {
    id: 'feedback',
    title: 'Get AI Feedback',
    description: 'After recording, you\'ll receive detailed feedback on your performance — including a score, transcript, and specific areas to improve.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    highlight: null
  },
  {
    id: 'ready',
    title: 'You\'re All Set! 🚀',
    description: 'That\'s it! You\'re ready to start practicing. Click your first class to begin your journey to becoming a confident speaker.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    highlight: null
  }
]

const STORAGE_KEY = 'speakeasy_tutorial_completed'

const StudentTutorial = ({ onComplete, forceShow = false }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check if tutorial was already completed
    const tutorialCompleted = localStorage.getItem(STORAGE_KEY)
    
    if (forceShow || !tutorialCompleted) {
      setIsVisible(true)
    }
  }, [forceShow])

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setIsAnimating(false)
      }, 200)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setIsAnimating(false)
      }, 200)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
    if (onComplete) {
      onComplete()
    }
  }

  const goToStep = (index) => {
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(index)
      setIsAnimating(false)
    }, 200)
  }

  if (!isVisible) {
    return null
  }

  const step = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-backdrop" onClick={handleSkip} />
      
      <div className={`tutorial-modal ${isAnimating ? 'animating' : ''}`}>
        <button className="tutorial-skip-btn" onClick={handleSkip}>
          Skip Tutorial
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="tutorial-icon-wrapper">
          <div className="tutorial-icon">
            {step.icon}
          </div>
          <div className="tutorial-icon-glow" />
        </div>

        <h2 className="tutorial-title">{step.title}</h2>
        <p className="tutorial-description">{step.description}</p>

        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => goToStep(index)}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          {!isFirstStep && (
            <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrevious}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>
          )}
          
          <button className="tutorial-btn tutorial-btn-primary" onClick={handleNext}>
            {isLastStep ? (
              <>
                Get Started
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </>
            ) : (
              <>
                Next
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </div>

        <div className="tutorial-step-counter">
          Step {currentStep + 1} of {TUTORIAL_STEPS.length}
        </div>
      </div>
    </div>
  )
}

// Export utility to reset tutorial (for testing or settings)
export const resetTutorial = () => {
  localStorage.removeItem(STORAGE_KEY)
}

// Export utility to check if tutorial is completed
export const isTutorialCompleted = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export default StudentTutorial
