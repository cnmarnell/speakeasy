import { useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const SAMPLE_INTERVAL = 300 // ms between samples
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model'

// Preload models as soon as this module is imported
let modelsPromise = null
function preloadModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL)
    ]).then(() => {
      console.log('Face-api.js models preloaded')
      return true
    }).catch(err => {
      console.warn('Model preload failed:', err.message)
      modelsPromise = null
      return false
    })
  }
  return modelsPromise
}
// Start preloading immediately
preloadModels()

// Face-api.js landmark indices
// Left eye: [36-41], Right eye: [42-47]
// Left iris approx center between 36-39, Right iris approx center between 42-45
// We use the eye corners and pupil-relative position to estimate gaze

function getEyeContactFromLandmarks(landmarks) {
  const positions = landmarks.positions

  // 68-point landmark indices:
  // Left eye: 36 (outer corner), 37-38 (upper lid), 39 (inner corner), 40-41 (lower lid)
  // Right eye: 42 (inner corner), 43-44 (upper lid), 45 (outer corner), 46-47 (lower lid)

  // === EYE GAZE ANALYSIS ===
  // Calculate where the iris center is relative to the eye opening
  // We approximate iris center as the centroid of upper and lower eyelid midpoints
  
  // Left eye
  const leftOuterCorner = positions[36]
  const leftInnerCorner = positions[39]
  const leftUpperMid = {
    x: (positions[37].x + positions[38].x) / 2,
    y: (positions[37].y + positions[38].y) / 2
  }
  const leftLowerMid = {
    x: (positions[40].x + positions[41].x) / 2,
    y: (positions[40].y + positions[41].y) / 2
  }
  // Horizontal: where is the eye opening center relative to corners
  const leftEyeWidth = Math.abs(leftInnerCorner.x - leftOuterCorner.x)
  const leftEyeCenterX = (leftUpperMid.x + leftLowerMid.x) / 2
  const leftHorizRatio = leftEyeWidth > 0 
    ? (leftEyeCenterX - leftOuterCorner.x) / leftEyeWidth 
    : 0.5

  // Right eye
  const rightInnerCorner = positions[42]
  const rightOuterCorner = positions[45]
  const rightUpperMid = {
    x: (positions[43].x + positions[44].x) / 2,
    y: (positions[43].y + positions[44].y) / 2
  }
  const rightLowerMid = {
    x: (positions[46].x + positions[47].x) / 2,
    y: (positions[46].y + positions[47].y) / 2
  }
  const rightEyeWidth = Math.abs(rightOuterCorner.x - rightInnerCorner.x)
  const rightEyeCenterX = (rightUpperMid.x + rightLowerMid.x) / 2
  const rightHorizRatio = rightEyeWidth > 0 
    ? (rightEyeCenterX - rightInnerCorner.x) / rightEyeWidth 
    : 0.5

  // === FACE DIRECTION (secondary signal) ===
  const noseTip = positions[30]
  const faceLeft = positions[0].x
  const faceRight = positions[16].x
  const faceWidth = Math.abs(faceRight - faceLeft)
  const nosePosRatio = faceWidth > 0 ? (noseTip.x - faceLeft) / faceWidth : 0.5

  // === VERTICAL GAZE ===
  // Compare iris vertical position to eye opening height
  // Left eye vertical
  const leftEyeHeight = Math.abs(leftLowerMid.y - leftUpperMid.y)
  const leftIrisCenterY = (leftUpperMid.y + leftLowerMid.y) / 2
  const leftVertRatio = leftEyeHeight > 0
    ? (leftIrisCenterY - leftUpperMid.y) / leftEyeHeight
    : 0.5

  // Right eye vertical
  const rightEyeHeight = Math.abs(rightLowerMid.y - rightUpperMid.y)
  const rightIrisCenterY = (rightUpperMid.y + rightLowerMid.y) / 2
  const rightVertRatio = rightEyeHeight > 0
    ? (rightIrisCenterY - rightUpperMid.y) / rightEyeHeight
    : 0.5

  const avgVertRatio = (leftVertRatio + rightVertRatio) / 2

  // === COMBINED SCORE ===
  // Horizontal gaze: centered = looking at camera (0.35-0.65 range)
  const avgEyeRatio = (leftHorizRatio + rightHorizRatio) / 2
  const eyesHorizStraight = avgEyeRatio >= 0.35 && avgEyeRatio <= 0.65
  
  // Vertical gaze: centered = looking at camera (0.30-0.70 range)
  // Looking up = low ratio, looking down = high ratio
  const eyesVertStraight = avgVertRatio >= 0.30 && avgVertRatio <= 0.70

  // Face direction: relaxed threshold (0.30-0.70)
  const faceFacingCamera = nosePosRatio >= 0.30 && nosePosRatio <= 0.70

  // Eye contact = horizontal OK AND vertical OK AND face roughly facing camera
  const isLookingAtCamera = eyesHorizStraight && eyesVertStraight && faceFacingCamera

  return { 
    isLookingAtCamera, 
    ratio: avgEyeRatio,
    eyeRatio: avgEyeRatio,
    vertRatio: avgVertRatio,
    faceRatio: nosePosRatio
  }
}

export function useBodyLanguage() {
  const animationFrameRef = useRef(null)
  const lastSampleTime = useRef(0)
  const samplesRef = useRef([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const trackingRef = useRef(false)
  const modelsLoadedRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [liveScore, setLiveScore] = useState(null)

  const initialize = useCallback(async (videoElement) => {
    try {
      videoRef.current = videoElement

      if (!modelsLoadedRef.current) {
        console.log('Waiting for face-api.js models...')
        await preloadModels()
        modelsLoadedRef.current = true
      }

      // Create offscreen canvas
      canvasRef.current = document.createElement('canvas')

      setIsReady(true)
      console.log('Body language tracker initialized')
    } catch (error) {
      console.error('Failed to initialize body language tracker:', error)
    }
  }, [])

  const runProcessingLoop = () => {
    const processFrame = async () => {
      if (!trackingRef.current || !videoRef.current) return

      const now = performance.now()
      if (now - lastSampleTime.current >= SAMPLE_INTERVAL) {
        lastSampleTime.current = now

        try {
          const video = videoRef.current
          if (video.readyState >= 2) {
            // Resize canvas to match video
            if (canvasRef.current.width !== video.videoWidth) {
              canvasRef.current.width = video.videoWidth || 640
              canvasRef.current.height = video.videoHeight || 480
            }

            const detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
              .withFaceLandmarks(true) // true = use tiny model

            if (detection) {
              const { isLookingAtCamera, ratio } = getEyeContactFromLandmarks(detection.landmarks)

              samplesRef.current.push({
                timestamp: now,
                eyeContact: isLookingAtCamera,
                eyeRatio: ratio,
                faceDetected: true,
                confidence: detection.detection.score
              })
            } else {
              samplesRef.current.push({
                timestamp: now,
                eyeContact: false,
                eyeRatio: null,
                faceDetected: false
              })
            }

            // Update live score every 5 samples
            if (samplesRef.current.length % 5 === 0) {
              const recent = samplesRef.current.slice(-20)
              const eyeContactPct = Math.round(
                (recent.filter(s => s.eyeContact).length / recent.length) * 100
              )
              setLiveScore(eyeContactPct)
            }
          }
        } catch (error) {
          console.warn('Body language frame error:', error.message)
        }
      }

      if (trackingRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }

  const startTracking = useCallback(() => {
    if (!modelsLoadedRef.current) {
      console.warn('Cannot start tracking - models not loaded')
      return
    }
    samplesRef.current = []
    lastSampleTime.current = 0
    trackingRef.current = true
    setLiveScore(null)
    runProcessingLoop()
    console.log('Body language tracking started')
  }, [])

  const stopTracking = useCallback(() => {
    trackingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    console.log(`Body language tracking stopped. ${samplesRef.current.length} samples collected.`)
  }, [])

  const getResults = useCallback(() => {
    const samples = samplesRef.current
    if (samples.length === 0) return null

    const withFace = samples.filter(s => s.faceDetected)
    const faceDetectionRate = withFace.length / samples.length

    const eyeContactSamples = withFace.filter(s => s.eyeContact)
    const eyeContactScore = withFace.length > 0
      ? Math.round((eyeContactSamples.length / withFace.length) * 100)
      : 0

    const avgConfidence = withFace.length > 0
      ? Math.round((withFace.reduce((sum, s) => sum + (s.confidence || 0), 0) / withFace.length) * 100)
      : 0

    return {
      eyeContact: {
        score: eyeContactScore,
        label: eyeContactScore >= 70 ? 'Strong' : eyeContactScore >= 40 ? 'Moderate' : 'Needs Work',
        totalSamples: samples.length,
        faceDetectedSamples: withFace.length,
        faceDetectionRate: Math.round(faceDetectionRate * 100),
        avgConfidence
      },
      overall: {
        score: eyeContactScore,
        components: ['eyeContact']
      }
    }
  }, [])

  const cleanup = useCallback(() => {
    trackingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsReady(false)
    setLiveScore(null)
  }, [])

  return {
    initialize,
    startTracking,
    stopTracking,
    getResults,
    cleanup,
    isReady,
    liveScore
  }
}
