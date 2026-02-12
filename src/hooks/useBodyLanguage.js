import { useRef, useState, useCallback } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Iris landmark indices from MediaPipe Face Mesh
// Left eye: iris center = 468, Left eye corners = 33 (inner), 133 (outer)
// Right eye: iris center = 473, Right eye corners = 362 (inner), 263 (outer)
const LEFT_IRIS_CENTER = 468
const LEFT_EYE_INNER = 33
const LEFT_EYE_OUTER = 133
const RIGHT_IRIS_CENTER = 473
const RIGHT_EYE_INNER = 362
const RIGHT_EYE_OUTER = 263

// How often to sample (ms)
const SAMPLE_INTERVAL = 200

export function useBodyLanguage() {
  const faceLandmarkerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastSampleTime = useRef(0)
  const samplesRef = useRef([])
  const videoRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [liveScore, setLiveScore] = useState(null)

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
      // Non-fatal - app works without it
    }
  }, [])

  const getEyeContactRatio = (landmarks) => {
    // Calculate how centered the iris is between inner and outer eye corners
    // Ratio near 0.5 = looking straight ahead, <0.3 or >0.7 = looking away

    const leftIris = landmarks[LEFT_IRIS_CENTER]
    const leftInner = landmarks[LEFT_EYE_INNER]
    const leftOuter = landmarks[LEFT_EYE_OUTER]

    const rightIris = landmarks[RIGHT_IRIS_CENTER]
    const rightInner = landmarks[RIGHT_EYE_INNER]
    const rightOuter = landmarks[RIGHT_EYE_OUTER]

    // Horizontal ratio: where is iris between inner and outer corner (0 to 1)
    const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x)
    const leftIrisPos = leftEyeWidth > 0 ? (leftIris.x - leftInner.x) / leftEyeWidth : 0.5

    const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x)
    const rightIrisPos = rightEyeWidth > 0 ? (rightIris.x - rightOuter.x) / rightEyeWidth : 0.5

    const avgHorizontal = (leftIrisPos + rightIrisPos) / 2

    // Consider "looking at camera" if iris is roughly centered (0.35 - 0.65)
    const isLookingAtCamera = avgHorizontal >= 0.35 && avgHorizontal <= 0.65

    return { isLookingAtCamera, ratio: avgHorizontal }
  }

  const processSample = useCallback((timestamp) => {
    if (!faceLandmarkerRef.current || !videoRef.current) return

    const now = performance.now()
    if (now - lastSampleTime.current < SAMPLE_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(processSample)
      return
    }
    lastSampleTime.current = now

    try {
      const video = videoRef.current
      if (video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processSample)
        return
      }

      const result = faceLandmarkerRef.current.detectForVideo(video, now)

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0]
        const { isLookingAtCamera, ratio } = getEyeContactRatio(landmarks)

        samplesRef.current.push({
          timestamp: now,
          eyeContact: isLookingAtCamera,
          eyeRatio: ratio,
          faceDetected: true
        })

        // Update live score every 10 samples
        if (samplesRef.current.length % 10 === 0) {
          const recent = samplesRef.current.slice(-30)
          const eyeContactPct = Math.round(
            (recent.filter(s => s.eyeContact).length / recent.length) * 100
          )
          setLiveScore(eyeContactPct)
        }
      } else {
        samplesRef.current.push({
          timestamp: now,
          eyeContact: false,
          eyeRatio: null,
          faceDetected: false
        })
      }
    } catch (error) {
      // Silent fail - don't break recording
    }

    animationFrameRef.current = requestAnimationFrame(processSample)
  }, [])

  const startTracking = useCallback(() => {
    if (!faceLandmarkerRef.current) return
    samplesRef.current = []
    lastSampleTime.current = 0
    setLiveScore(null)
    animationFrameRef.current = requestAnimationFrame(processSample)
    console.log('Body language tracking started')
  }, [processSample])

  const stopTracking = useCallback(() => {
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
        score: eyeContactScore, // For now, overall = eye contact. Will add more later.
        components: ['eyeContact']
      }
    }
  }, [])

  const cleanup = useCallback(() => {
    stopTracking()
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close()
      faceLandmarkerRef.current = null
    }
    setIsReady(false)
    setLiveScore(null)
  }, [stopTracking])

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
