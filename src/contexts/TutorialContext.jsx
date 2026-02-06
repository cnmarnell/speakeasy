import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const TutorialContext = createContext(null)

// Tutorial steps configuration
export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    page: null, // Shows on any page
    target: null, // No element highlight - just modal
    title: 'Welcome to Speakeasy! 🎤',
    text: 'Practice your public speaking skills and get instant AI feedback on your presentations. Let\'s take a quick tour!',
    action: 'button', // Click "Get Started" button
    buttonText: 'Get Started',
    position: 'center'
  },
  {
    id: 'classes',
    page: '/dashboard',
    target: '[data-tutorial="class-card"]',
    title: 'Your Classes',
    text: 'This is Career Practice — your first class! Click it to see your assignments.',
    action: 'click-element', // Click the actual element to advance
    buttonText: 'Skip',
    position: 'right'
  },
  {
    id: 'stats',
    page: '/class/',
    target: '[data-tutorial="stats"]',
    title: 'Track Your Progress',
    text: 'These stats show your assignment progress — Total, Pending, and Completed. Stay on top of your practice!',
    action: 'button',
    buttonText: 'Next',
    position: 'bottom',
    spotlightOffsetX: -22 // Adjust to move spotlight left (-) or right (+)
  },
  {
    id: 'assignments',
    page: '/class/',
    target: '[data-tutorial="assignment-card"]',
    title: 'Your Assignments',
    text: 'Assignments from your teacher appear here. The badge shows the status — Pending, Completed, or Overdue. Click one to get started!',
    action: 'click-element',
    fallbackAction: 'button', // If no assignments exist
    buttonText: 'Skip',
    position: 'top',
    extraOffset: 80 // Push tooltip higher for this step
  },
  {
    id: 'record',
    page: '/assignment/',
    target: '[data-tutorial="record-cta"]',
    title: 'Record Your Speech',
    text: 'When you\'re ready to practice, click "Start Recording" to begin. You\'ll need to allow camera and microphone access.',
    action: 'click-element',
    buttonText: 'Skip',
    position: 'top',
    extraOffset: 20 // Adjust this number to move tooltip higher/lower
  },
  {
    id: 'complete',
    page: '/record',
    target: null,
    title: 'You\'re All Set! 🎉',
    text: 'After recording, our AI will analyze your speech for content, filler words, and delivery. Your results appear instantly. Now go practice!',
    action: 'button',
    buttonText: 'Finish Tutorial',
    position: 'center'
  }
]

const STORAGE_KEY = 'speakeasy_tutorial_completed'

export function TutorialProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [hasCompleted, setHasCompleted] = useState(false)
  const location = useLocation()

  // Check if tutorial was completed before
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (completed === 'true') {
      setHasCompleted(true)
    }
  }, [])

  // Get current step
  const currentStep = TUTORIAL_STEPS[currentStepIndex]

  // Check if current step should show on current page
  const shouldShowStep = useCallback(() => {
    if (!isActive || !currentStep) return false
    if (currentStep.page === null) return true // Welcome modal shows anywhere
    return location.pathname.includes(currentStep.page)
  }, [isActive, currentStep, location.pathname])

  // Start tutorial
  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0)
    setIsActive(true)
  }, [])

  // Advance to next step
  const nextStep = useCallback(() => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      // Tutorial complete
      setIsActive(false)
      setHasCompleted(true)
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [currentStepIndex])

  // Skip current step
  const skipStep = useCallback(() => {
    nextStep()
  }, [nextStep])

  // Exit tutorial entirely
  const exitTutorial = useCallback(() => {
    setIsActive(false)
    setHasCompleted(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  // Restart tutorial
  const restartTutorial = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setHasCompleted(false)
    setCurrentStepIndex(0)
    setIsActive(true)
  }, [])

  // Auto-start tutorial for first-time users (after a short delay)
  useEffect(() => {
    // Check if user is on dashboard (flexible match)
    const isOnDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard')
    
    if (!hasCompleted && !isActive && isOnDashboard) {
      const timer = setTimeout(() => {
        const completed = localStorage.getItem(STORAGE_KEY)
        if (completed !== 'true') {
          console.log('[Tutorial] Auto-starting for first-time user')
          startTutorial()
        }
      }, 800) // Slightly longer delay to ensure page is fully rendered
      return () => clearTimeout(timer)
    }
  }, [hasCompleted, isActive, location.pathname, startTutorial])

  const value = {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    hasCompleted,
    shouldShowStep: shouldShowStep(),
    startTutorial,
    nextStep,
    skipStep,
    exitTutorial,
    restartTutorial
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}

export default TutorialContext
