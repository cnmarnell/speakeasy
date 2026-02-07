import { useEffect, useState, useRef } from 'react'
import { useTutorial } from '../contexts/TutorialContext'
import './TutorialOverlay.css'

function TutorialOverlay() {
  const { 
    isActive, 
    currentStep, 
    nextStep, 
    dismissStep,
    disableTutorials
  } = useTutorial()
  
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const tooltipRef = useRef(null)

  // Lock scroll when tutorial is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isActive])

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep?.target) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const findTarget = () => {
      const target = document.querySelector(currentStep.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        
        // Get padding values
        const defaultPadding = 8
        const basePadding = currentStep.spotlightPadding ?? defaultPadding
        const paddingTop = currentStep.spotlightPaddingTop ?? basePadding
        const paddingRight = currentStep.spotlightPaddingRight ?? basePadding
        const paddingBottom = currentStep.spotlightPaddingBottom ?? basePadding
        const paddingLeft = currentStep.spotlightPaddingLeft ?? basePadding
        
        // Get optional offsets
        const offsetX = currentStep.spotlightOffsetX || 0
        const offsetY = currentStep.spotlightOffsetY || 0
        
        const spotlightRect = {
          top: rect.top - paddingTop + offsetY,
          left: rect.left - paddingLeft + offsetX,
          width: rect.width + paddingLeft + paddingRight,
          height: rect.height + paddingTop + paddingBottom,
          bottom: rect.bottom + paddingBottom + offsetY,
          right: rect.right + paddingRight + offsetX
        }
        setTargetRect(spotlightRect)

        // Calculate tooltip position
        const tooltipPos = calculateTooltipPosition(spotlightRect, currentStep.position, currentStep.extraOffset)
        setTooltipStyle(tooltipPos)
      } else {
        // Element not found - retry
        setTimeout(findTarget, 100)
      }
    }

    const timeoutId = setTimeout(findTarget, 50)
    return () => clearTimeout(timeoutId)
  }, [isActive, currentStep])

  // Calculate tooltip position
  const calculateTooltipPosition = (spotlightRect, position, extraOffset = 0) => {
    const gap = 48 + extraOffset
    const tooltipWidth = 320
    const tooltipHeight = 220
    const margin = 16

    const clampTop = (top) => Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin))
    const clampLeft = (left) => Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin))

    const centeredLeft = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2
    const centeredTop = spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2

    switch (position) {
      case 'top':
        return {
          top: `${Math.max(margin, spotlightRect.top - tooltipHeight - gap)}px`,
          left: `${clampLeft(centeredLeft)}px`
        }
      case 'bottom':
        return {
          top: `${Math.min(spotlightRect.bottom + gap, window.innerHeight - tooltipHeight - margin)}px`,
          left: `${clampLeft(centeredLeft)}px`
        }
      case 'left':
        return {
          top: `${clampTop(centeredTop)}px`,
          left: `${Math.max(margin, spotlightRect.left - tooltipWidth - gap)}px`
        }
      case 'right':
        return {
          top: `${clampTop(centeredTop)}px`,
          left: `${Math.min(spotlightRect.right + gap, window.innerWidth - tooltipWidth - margin)}px`
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

  // Handle click outside tooltip and spotlight
  const handleBackdropClick = (e) => {
    // Check if click is on the backdrop (not tooltip or spotlight)
    const isTooltipClick = tooltipRef.current?.contains(e.target)
    const isSpotlightClick = e.target.classList.contains('tutorial-spotlight') || 
                            e.target.classList.contains('tutorial-spotlight-border')
    
    if (!isTooltipClick && !isSpotlightClick) {
      if (dontShowAgain) {
        disableTutorials()
      } else {
        dismissStep()
      }
    }
  }

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return
      if (e.key === 'Escape') {
        if (dontShowAgain) {
          disableTutorials()
        } else {
          dismissStep()
        }
      } else if (e.key === 'Enter') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, dismissStep, disableTutorials, dontShowAgain])

  const handleNext = () => {
    if (dontShowAgain) {
      disableTutorials()
    } else {
      nextStep()
    }
  }

  if (!isActive || !currentStep) return null

  const isCenter = currentStep?.position === 'center' || !currentStep?.target

  return (
    <div className="tutorial-overlay" onClick={handleBackdropClick}>
      {/* Dark overlay with spotlight cutout */}
      {targetRect ? (
        <div 
          className="tutorial-backdrop-with-spotlight"
          style={{
            '--spotlight-top': `${targetRect.top}px`,
            '--spotlight-left': `${targetRect.left}px`,
            '--spotlight-width': `${targetRect.width}px`,
            '--spotlight-height': `${targetRect.height}px`
          }}
        />
      ) : (
        <div className="tutorial-backdrop" />
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
        ref={tooltipRef}
        className={`tutorial-tooltip ${isCenter ? 'tutorial-tooltip-center' : ''}`}
        style={!isCenter ? tooltipStyle : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="tutorial-title">{currentStep?.title}</h3>
        <p className="tutorial-text">{currentStep?.text}</p>

        <div className="tutorial-buttons">
          <button className="tutorial-btn tutorial-btn-primary" onClick={handleNext}>
            {currentStep?.buttonText || 'Next'}
          </button>
        </div>

        {/* Don't show again checkbox */}
        <label className="tutorial-dont-show">
          <input 
            type="checkbox" 
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span>Don't show tutorials again</span>
        </label>

        <p className="tutorial-dismiss-hint">
          Click anywhere outside to dismiss
        </p>
      </div>
    </div>
  )
}

export default TutorialOverlay
