import { useEffect, useState, useRef } from 'react'
import { useTutorial } from '../contexts/TutorialContext'
import './TutorialOverlay.css'

function TutorialOverlay() {
  const { 
    isActive, 
    currentStep, 
    currentStepIndex,
    totalSteps,
    shouldShowStep,
    nextStep, 
    skipStep, 
    exitTutorial 
  } = useTutorial()
  
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const overlayRef = useRef(null)

  // Find and highlight target element
  useEffect(() => {
    if (!shouldShowStep || !currentStep?.target) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const findTarget = () => {
      const target = document.querySelector(currentStep.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        const padding = 8
        // Use viewport-relative positions (getBoundingClientRect returns viewport coords)
        const spotlightRect = {
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          bottom: rect.bottom + padding,
          right: rect.right + padding
        }
        setTargetRect(spotlightRect)

        // Calculate tooltip position based on spotlight rect
        const tooltipPos = calculateTooltipPosition(spotlightRect, currentStep.position)
        setTooltipStyle(tooltipPos)

        // Add click listener for interactive elements
        if (currentStep.action === 'click-element') {
          const handleClick = () => {
            nextStep()
          }
          target.addEventListener('click', handleClick, { once: true })
          return () => target.removeEventListener('click', handleClick)
        }
      } else {
        // Element not found - might be loading, retry
        setTimeout(findTarget, 100)
      }
    }

    const timeoutId = setTimeout(findTarget, 50)
    return () => clearTimeout(timeoutId)
  }, [shouldShowStep, currentStep, nextStep])

  // Calculate tooltip position based on spotlight rect (viewport coords)
  const calculateTooltipPosition = (spotlightRect, position) => {
    const gap = 20
    const tooltipWidth = 320
    const tooltipHeight = 200 // Approximate

    switch (position) {
      case 'top':
        return {
          top: `${spotlightRect.top - tooltipHeight - gap}px`,
          left: `${Math.max(16, Math.min(spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16))}px`
        }
      case 'bottom':
        return {
          top: `${spotlightRect.bottom + gap}px`,
          left: `${Math.max(16, Math.min(spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16))}px`
        }
      case 'left':
        return {
          top: `${spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2}px`,
          left: `${spotlightRect.left - tooltipWidth - gap}px`
        }
      case 'right':
        return {
          top: `${spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2}px`,
          left: `${spotlightRect.right + gap}px`
        }
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return
      if (e.key === 'Escape') {
        exitTutorial()
      } else if (e.key === 'Enter' && currentStep?.action === 'button') {
        nextStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStep, nextStep, exitTutorial])

  if (!isActive || !shouldShowStep) return null

  const isCenter = currentStep?.position === 'center' || !currentStep?.target
  const showClickHint = currentStep?.action === 'click-element'

  return (
    <div className="tutorial-overlay" ref={overlayRef}>
      {/* Dark overlay - transparent when spotlight exists, dark otherwise */}
      <div className={`tutorial-backdrop ${targetRect ? 'has-spotlight' : 'no-spotlight'}`} />
      
      {/* Spotlight cutout with box-shadow creating the dark overlay */}
      {targetRect && (
        <div 
          className="tutorial-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      )}

      {/* Spotlight border/glow effect */}
      {targetRect && (
        <div 
          className="tutorial-spotlight-border"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      )}

      {/* Tooltip */}
      <div 
        className={`tutorial-tooltip ${isCenter ? 'tutorial-tooltip-center' : ''}`}
        style={!isCenter ? tooltipStyle : undefined}
      >
        <div className="tutorial-tooltip-header">
          <span className="tutorial-step-indicator">
            {currentStepIndex + 1} of {totalSteps}
          </span>
          <button className="tutorial-exit-btn" onClick={exitTutorial}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 className="tutorial-title">{currentStep?.title}</h3>
        <p className="tutorial-text">{currentStep?.text}</p>

        {showClickHint && (
          <p className="tutorial-click-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click the highlighted element to continue
          </p>
        )}

        <div className="tutorial-buttons">
          {currentStep?.action === 'button' && (
            <button className="tutorial-btn tutorial-btn-primary" onClick={nextStep}>
              {currentStep?.buttonText || 'Next'}
            </button>
          )}
          {currentStep?.action === 'click-element' && (
            <button className="tutorial-btn tutorial-btn-secondary" onClick={skipStep}>
              {currentStep?.buttonText || 'Skip'}
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="tutorial-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={`tutorial-progress-dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TutorialOverlay
