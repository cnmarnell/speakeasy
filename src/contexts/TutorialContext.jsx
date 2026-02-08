// Tutorial Context v2 - Force deploy 2026-02-08
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const TutorialContext = createContext(null)

// Tutorial steps - grouped by page context
export const TUTORIAL_STEPS = {
  // Dashboard - welcome intro
  welcome: {
    id: 'welcome',
    page: '/dashboard',
    target: null,
    title: 'Welcome to Speakeasy! 🎤',
    text: 'Practice your public speaking skills and get instant AI feedback. Let\'s take a quick tour!',
    buttonText: 'Get Started',
    position: 'center',
    nextStep: 'classes',
    dismissBehavior: 'advance'
  },
  
  // Dashboard - click into a class
  classes: {
    id: 'classes',
    page: '/dashboard',
    target: '[data-tutorial="class-card"]',
    title: 'Your Classes',
    text: 'This is Career Practice — your first class! Click it to see your assignments.',
    buttonText: 'Got it',
    position: 'right',
    nextStep: null,
    dismissBehavior: 'close'
  },
  
  // Class page - stats
  stats: {
    id: 'stats',
    page: '/class/',
    target: '[data-tutorial="stats"]',
    title: 'Track Your Progress',
    text: 'These stats show your assignment progress — Total, Pending, and Completed. Stay on top of your practice!',
    buttonText: 'Next',
    position: 'bottom',
    spotlightOffsetX: -22,
    nextStep: 'assignments',
    dismissBehavior: 'advance'
  },
  
  // Class page - assignments
  assignments: {
    id: 'assignments',
    page: '/class/',
    target: '[data-tutorial="assignment-card"]',
    title: 'Your Assignments',
    text: 'Assignments from your teacher appear here. Click one to get started practicing!',
    buttonText: 'Got it',
    position: 'top',
    extraOffset: 80,
    nextStep: null,
    dismissBehavior: 'close'
  },
  
  // Assignment page - record
  record: {
    id: 'record',
    page: '/assignment/',
    target: '[data-tutorial="record-cta"]',
    title: 'Record Your Speech',
    text: 'Read the assignment description, then click "Start Recording" when you\'re ready. You\'ll need to allow camera and microphone access.',
    buttonText: 'Got it',
    position: 'top',
    extraOffset: -610,
    spotlightPaddingTop: 200,
    spotlightPaddingBottom: 10,
    spotlightPaddingLeft: 20,
    spotlightPaddingRight: 20,
    nextStep: null,
    dismissBehavior: 'close'
  }
}

// Map pages to their starting tutorial step
const PAGE_TUTORIAL_MAP = {
  '/dashboard': 'welcome',
  '/class/': 'stats',
  '/assignment/': 'record'
}

const STORAGE_KEY = 'speakeasy_tutorial_disabled'
const SEEN_STEPS_KEY = 'speakeasy_tutorial_seen'

export function TutorialProvider({ children }) {
  const [currentStepId, setCurrentStepId] = useState(null)
  const [isDisabled, setIsDisabled] = useState(false)
  const [seenSteps, setSeenSteps] = useState(new Set())
  const [manualTrigger, setManualTrigger] = useState(false)
  const location = useLocation()

  // Load disabled state and seen steps from localStorage
  useEffect(() => {
    const disabled = localStorage.getItem(STORAGE_KEY) === 'true'
    setIsDisabled(disabled)
    
    const seen = localStorage.getItem(SEEN_STEPS_KEY)
    if (seen) {
      try {
        setSeenSteps(new Set(JSON.parse(seen)))
      } catch (e) {
        setSeenSteps(new Set())
      }
    }
  }, [])

  // Get current step object
  const currentStep = currentStepId ? TUTORIAL_STEPS[currentStepId] : null

  // Check which tutorial should show for current page
  const getTutorialForPage = useCallback((pathname) => {
    // Check exact matches first, then partial matches
    if (pathname === '/dashboard') return 'welcome'
    if (pathname.includes('/class/') && pathname.includes('/assignment/')) return 'record'
    if (pathname.includes('/class/')) return 'stats'
    if (pathname.includes('/assignment/')) return 'record'
    return null
  }, [])

  // Show tutorial for current page if not seen and not disabled
  useEffect(() => {
    if (isDisabled && !manualTrigger) return
    
    const stepId = getTutorialForPage(location.pathname)
    if (stepId && (!seenSteps.has(stepId) || manualTrigger)) {
      // Small delay to let page render
      const timer = setTimeout(() => {
        setCurrentStepId(stepId)
        if (manualTrigger) setManualTrigger(false)
      }, 500)
      return () => clearTimeout(timer)
    } else if (!currentStepId) {
      setCurrentStepId(null)
    }
  }, [location.pathname, isDisabled, seenSteps, getTutorialForPage, manualTrigger])

  // Mark step as seen
  const markSeen = useCallback((stepId) => {
    setSeenSteps(prev => {
      const newSet = new Set(prev)
      newSet.add(stepId)
      localStorage.setItem(SEEN_STEPS_KEY, JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  // Handle Next button click
  const nextStep = useCallback(() => {
    if (!currentStep) return
    
    markSeen(currentStep.id)
    
    if (currentStep.nextStep) {
      // Advance to next step on same page
      setCurrentStepId(currentStep.nextStep)
    } else {
      // No more steps, close tutorial
      setCurrentStepId(null)
    }
  }, [currentStep, markSeen])

  // Handle dismiss (click outside)
  const dismissStep = useCallback(() => {
    if (!currentStep) return
    
    markSeen(currentStep.id)
    
    if (currentStep.dismissBehavior === 'advance' && currentStep.nextStep) {
      // Dismissing acts like Next - show next step
      setCurrentStepId(currentStep.nextStep)
    } else {
      // Close tutorial
      setCurrentStepId(null)
    }
  }, [currentStep, markSeen])

  // Disable tutorials permanently
  const disableTutorials = useCallback(() => {
    setIsDisabled(true)
    setCurrentStepId(null)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  // Restart tutorial from the beginning (for help button)
  const restartTutorial = useCallback(() => {
    // Clear seen steps and disabled state
    setSeenSteps(new Set())
    setIsDisabled(false)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SEEN_STEPS_KEY)
    
    // Trigger tutorial for current page
    setManualTrigger(true)
    const stepId = getTutorialForPage(location.pathname)
    if (stepId) {
      setCurrentStepId(stepId)
    }
  }, [getTutorialForPage, location.pathname])

  const value = {
    currentStep,
    isActive: !!currentStepId,
    isDisabled,
    nextStep,
    dismissStep,
    disableTutorials,
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
