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

  // === HEAD YAW (left/right turn) ===
  // Nose position relative to face edges
  const noseTip = positions[30]
  const faceLeft = positions[0].x
  const faceRight = positions[16].x
  const faceWidth = Math.abs(faceRight - faceLeft)
  const yawRatio = faceWidth > 0 ? (noseTip.x - faceLeft) / faceWidth : 0.5
  // Centered = 0.5, looking left < 0.4, looking right > 0.6

  // === HEAD PITCH (up/down tilt) ===
  // Compare nose tip Y to the midpoint between eyes, normalized by face height
  const eyeMidY = (positions[39].y + positions[42].y) / 2 // between inner eye corners
  const chin = positions[8] // bottom of chin
  const faceHeight = Math.abs(chin.y - positions[19].y) // chin to brow
  
  // How far below the eye line is the nose tip, as ratio of face height
  // Neutral ~= 0.30-0.40. Looking down = nose appears higher relative to chin (ratio decreases)
  // Looking up = nose drops relative to eyes (ratio increases) 
  const noseToEyeDist = noseTip.y - eyeMidY
  const pitchRatio = faceHeight > 0 ? noseToEyeDist / faceHeight : 0.35

  // === EYE OPENNESS (are eyes open/looking at camera vs looking away) ===
  // Eye Aspect Ratio - closed/squinting eyes suggest looking away or down
  const leftEyeHeight = (
    Math.abs(positions[37].y - positions[41].y) + 
    Math.abs(positions[38].y - positions[40].y)
  ) / 2
  const leftEyeWidth = Math.abs(positions[39].x - positions[36].x)
  const leftEAR = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0.3

  const rightEyeHeight = (
    Math.abs(positions[43].y - positions[47].y) + 
    Math.abs(positions[44].y - positions[46].y)
  ) / 2
  const rightEyeWidth = Math.abs(positions[45].x - positions[42].x)
  const rightEAR = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0.3

  const avgEAR = (leftEAR + rightEAR) / 2
  // Normal open eyes ~0.25-0.35, blinking/closed < 0.15

  // === COMBINED: Are they looking at the camera? ===
  const yawOK = yawRatio >= 0.35 && yawRatio <= 0.65    // head not turned too far
  const pitchOK = pitchRatio >= 0.20 && pitchRatio <= 0.50 // head not tilted up/down too far
  const eyesOpen = avgEAR >= 0.15                          // eyes are actually open

  const isLookingAtCamera = yawOK && pitchOK && eyesOpen

  return { 
    isLookingAtCamera, 
    yawRatio,
    pitchRatio,
    eyeAspectRatio: avgEAR
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
