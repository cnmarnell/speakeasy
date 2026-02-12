import { useRef, useState, useCallback, useEffect } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Iris landmark indices from MediaPipe Face Mesh
const LEFT_IRIS_CENTER = 468
const LEFT_EYE_INNER = 33
const LEFT_EYE_OUTER = 133
const RIGHT_IRIS_CENTER = 473
const RIGHT_EYE_INNER = 362
const RIGHT_EYE_OUTER = 263

const SAMPLE_INTERVAL = 200

function getEyeContactRatio(landmarks) {
  const leftIris = landmarks[LEFT_IRIS_CENTER]
  const leftInner = landmarks[LEFT_EYE_INNER]
  const leftOuter = landmarks[LEFT_EYE_OUTER]
  const rightIris = landmarks[RIGHT_IRIS_CENTER]
  const rightInner = landmarks[RIGHT_EYE_INNER]
  const rightOuter = landmarks[RIGHT_EYE_OUTER]

  const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x)
  const leftIrisPos = leftEyeWidth > 0 ? (leftIris.x - leftInner.x) / leftEyeWidth : 0.5
  const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x)
  const rightIrisPos = rightEyeWidth > 0 ? (rightIris.x - rightOuter.x) / rightEyeWidth : 0.5

  const avgHorizontal = (leftIrisPos + rightIrisPos) / 2
  const isLookingAtCamera = avgHorizontal >= 0.35 && avgHorizontal <= 0.65

  return { isLookingAtCamera, ratio: avgHorizontal }
}

export function useBodyLanguage() {
  const faceLandmarkerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastSampleTime = useRef(0)
  const samplesRef = useRef([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const trackingRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [liveScore, setLiveScore] = useState(null)

  // Processing loop as a plain function using refs (no stale closures)
  const runProcessingLoop = () => {
    const processFrame = () => {
      if (!trackingRef.current || !faceLandmarkerRef.current || !videoRef.current) {
        return
      }

      const now = performance.now()
      if (now - lastSampleTime.current >= SAMPLE_INTERVAL) {
        lastSampleTime.current = now

        try {
          const video = videoRef.current
          if (video.readyState >= 2) {
            // Draw video frame to offscreen canvas to avoid WebGL conflicts
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas')
              canvasRef.current.width = video.videoWidth || 640
              canvasRef.current.height = video.videoHeight || 480
              ctxRef.current = canvasRef.current.getContext('2d')
            }
            ctxRef.current.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height)
            const result = faceLandmarkerRef.current.detectForVideo(canvasRef.current, now)

            if (result.faceLandmarks && result.faceLandmarks.length > 0) {
              const landmarks = result.faceLandmarks[0]
              const { isLookingAtCamera, ratio } = getEyeContactRatio(landmarks)

              samplesRef.current.push({
                timestamp: now,
                eyeContact: isLookingAtCamera,
                eyeRatio: ratio,
                faceDetected: true
              })
            } else {
              samplesRef.current.push({
                timestamp: now,
                eyeContact: false,
                eyeRatio: null,
                faceDetected: false
              })
            }

            // Update live score every 10 samples
            if (samplesRef.current.length % 10 === 0) {
              const recent = samplesRef.current.slice(-30)
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

  const initialize = useCallback(async (videoElement) => {
    try {
      videoRef.current = videoElement

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )

      // Try GPU first, fall back to CPU
      let landmarker = null
      for (const delegate of ['GPU', 'CPU']) {
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
              delegate
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFacialTransformationMatrixes: false,
            outputFaceBlendshapes: false
          })
          console.log(`Body language tracker initialized (${delegate})`)
          break
        } catch (err) {
          console.warn(`FaceLandmarker ${delegate} failed:`, err.message)
        }
      }

      if (landmarker) {
        faceLandmarkerRef.current = landmarker
        setIsReady(true)
      } else {
        console.error('Body language tracker: both GPU and CPU failed')
      }
    } catch (error) {
      console.error('Failed to initialize body language tracker:', error)
    }
  }, [])

  const startTracking = useCallback(() => {
    if (!faceLandmarkerRef.current) {
      console.warn('Cannot start tracking - not initialized')
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

    return {
      eyeContact: {
        score: eyeContactScore,
        label: eyeContactScore >= 70 ? 'Strong' : eyeContactScore >= 40 ? 'Moderate' : 'Needs Work',
        totalSamples: samples.length,
        faceDetectedSamples: withFace.length,
        faceDetectionRate: Math.round(faceDetectionRate * 100)
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
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close()
      faceLandmarkerRef.current = null
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
