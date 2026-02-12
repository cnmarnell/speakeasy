import { useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const SAMPLE_INTERVAL = 300 // ms between samples

// === SENSITIVITY CONFIG ===
// Adjust these to make eye contact detection more or less strict
// Range: 0.0 (center only) to 0.5 (anything counts)
// Lower = stricter, Higher = more forgiving
export const EYE_CONTACT_SENSITIVITY = {
  irisHorizontal: 0.20,   // how far iris can be off-center horizontally (0.30-0.70 with 0.20)
  irisVertical: 0.20,     // how far iris can be off-center vertically
  headYaw: 0.20,          // how far head can turn left/right
  headPitch: 0.20,        // how far head can tilt up/down
}
// To make it MORE sensitive (stricter): decrease values toward 0.10
// To make it LESS sensitive (forgiving): increase values toward 0.30
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

// Crop eye region from canvas and find iris position via pixel thresholding
function getIrisPosition(canvas, ctx, eyePoints) {
  // Get bounding box of eye with padding
  const xs = eyePoints.map(p => p.x)
  const ys = eyePoints.map(p => p.y)
  const minX = Math.floor(Math.min(...xs))
  const maxX = Math.ceil(Math.max(...xs))
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.ceil(Math.max(...ys))
  
  const padX = Math.round((maxX - minX) * 0.1)
  const padY = Math.round((maxY - minY) * 0.3) // more vertical padding
  
  const x = Math.max(0, minX - padX)
  const y = Math.max(0, minY - padY)
  const w = Math.min(canvas.width - x, (maxX - minX) + padX * 2)
  const h = Math.min(canvas.height - y, (maxY - minY) + padY * 2)
  
  if (w < 5 || h < 5) return null
  
  // Get pixel data for eye region
  const imageData = ctx.getImageData(x, y, w, h)
  const pixels = imageData.data
  
  // Convert to grayscale and find threshold
  const gray = []
  for (let i = 0; i < pixels.length; i += 4) {
    // Weighted grayscale
    const g = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114
    gray.push(g)
  }
  
  // Find darkest 20% of pixels (iris + pupil are the darkest parts)
  const sorted = [...gray].sort((a, b) => a - b)
  const threshold = sorted[Math.floor(sorted.length * 0.2)]
  
  // Calculate centroid of dark pixels (iris center)
  let sumX = 0, sumY = 0, count = 0
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = py * w + px
      if (gray[idx] <= threshold) {
        sumX += px
        sumY += py
        count++
      }
    }
  }
  
  if (count === 0) return null
  
  // Iris center as ratio within the eye crop (0-1)
  const irisCenterX = (sumX / count) / w
  const irisCenterY = (sumY / count) / h
  
  return { x: irisCenterX, y: irisCenterY }
}

function getEyeContactFromLandmarks(landmarks, canvas, ctx) {
  const positions = landmarks.positions

  // === IRIS TRACKING (primary signal) ===
  // Left eye landmarks: 36-41, Right eye: 42-47
  const leftEyePoints = [36,37,38,39,40,41].map(i => positions[i])
  const rightEyePoints = [42,43,44,45,46,47].map(i => positions[i])
  
  const leftIris = canvas && ctx ? getIrisPosition(canvas, ctx, leftEyePoints) : null
  const rightIris = canvas && ctx ? getIrisPosition(canvas, ctx, rightEyePoints) : null
  
  let irisHorizOK = true
  let irisVertOK = true
  let avgIrisX = 0.5
  let avgIrisY = 0.5
  
  if (leftIris && rightIris) {
    avgIrisX = (leftIris.x + rightIris.x) / 2
    avgIrisY = (leftIris.y + rightIris.y) / 2
    
    // Centered iris = looking at camera
    const hSens = EYE_CONTACT_SENSITIVITY.irisHorizontal
    const vSens = EYE_CONTACT_SENSITIVITY.irisVertical
    irisHorizOK = avgIrisX >= (0.50 - hSens) && avgIrisX <= (0.50 + hSens)
    irisVertOK = avgIrisY >= (0.45 - vSens) && avgIrisY <= (0.45 + vSens) // 0.45 center since iris sits slightly high
  }

  // === HEAD DIRECTION (secondary signal) ===
  const noseTip = positions[30]
  const faceLeft = positions[0].x
  const faceRight = positions[16].x
  const faceWidth = Math.abs(faceRight - faceLeft)
  const yawRatio = faceWidth > 0 ? (noseTip.x - faceLeft) / faceWidth : 0.5

  const eyeMidY = (positions[39].y + positions[42].y) / 2
  const chin = positions[8]
  const faceHeight = Math.abs(chin.y - positions[19].y)
  const noseToEyeDist = noseTip.y - eyeMidY
  const pitchRatio = faceHeight > 0 ? noseToEyeDist / faceHeight : 0.35

  // === EYE OPENNESS ===
  const leftEyeH = (Math.abs(positions[37].y - positions[41].y) + Math.abs(positions[38].y - positions[40].y)) / 2
  const leftEyeW = Math.abs(positions[39].x - positions[36].x)
  const rightEyeH = (Math.abs(positions[43].y - positions[47].y) + Math.abs(positions[44].y - positions[46].y)) / 2
  const rightEyeW = Math.abs(positions[45].x - positions[42].x)
  const avgEAR = ((leftEyeW > 0 ? leftEyeH/leftEyeW : 0.3) + (rightEyeW > 0 ? rightEyeH/rightEyeW : 0.3)) / 2

  // === COMBINED ===
  const ySens = EYE_CONTACT_SENSITIVITY.headYaw
  const pSens = EYE_CONTACT_SENSITIVITY.headPitch
  const headYawOK = yawRatio >= (0.50 - ySens) && yawRatio <= (0.50 + ySens)
  const headPitchOK = pitchRatio >= (0.35 - pSens) && pitchRatio <= (0.35 + pSens)
  const eyesOpen = avgEAR >= 0.15

  const isLookingAtCamera = irisHorizOK && irisVertOK && headYawOK && headPitchOK && eyesOpen

  return { 
    isLookingAtCamera, 
    irisX: avgIrisX,
    irisY: avgIrisY,
    yawRatio,
    pitchRatio
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

            // Draw to offscreen canvas for iris analysis
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas')
            }
            const c = canvasRef.current
            if (c.width !== video.videoWidth) {
              c.width = video.videoWidth || 640
              c.height = video.videoHeight || 480
            }
            const cCtx = c.getContext('2d', { willReadFrequently: true })
            cCtx.drawImage(video, 0, 0, c.width, c.height)

            const detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
              .withFaceLandmarks(true)

            if (detection) {
              const { isLookingAtCamera, irisX, irisY } = getEyeContactFromLandmarks(detection.landmarks, c, cCtx)

              samplesRef.current.push({
                timestamp: now,
                eyeContact: isLookingAtCamera,
                irisX,
                irisY,
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
