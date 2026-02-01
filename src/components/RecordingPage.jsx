import { useState, useRef, useEffect } from 'react'
import { initiateSubmission, checkSubmissionStatus, uploadVideoToStorage, triggerQueueProcessor } from '../data/supabaseData'

function RecordingPage({ assignment, studentId, onBack }) {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunks = useRef([])

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      setMediaStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access denied. Please allow camera access to record.')
    }
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
  }

  const startRecording = () => {
    if (!mediaStream) return

    recordedChunks.current = []
    mediaRecorderRef.current = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm;codecs=vp9'
    })

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data)
      }
    }

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' })
      setRecordedBlob(blob)
      setHasRecorded(true)
    }

    mediaRecorderRef.current.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const reRecord = () => {
    setHasRecorded(false)
    setRecordedBlob(null)
    recordedChunks.current = []
  }

  const sendForAnalysis = async () => {
    if (!recordedBlob) return

    setIsProcessing(true)

    try {
      // Step 1: Upload video to Supabase Storage
      console.log('Uploading video to storage...')
      const uploadResult = await uploadVideoToStorage(recordedBlob, studentId, assignment.id)
      console.log('Video uploaded successfully:', uploadResult)

      // Step 2: Initiate submission (FAST - returns immediately with pending status)
      const { submissionId, status } = await initiateSubmission({
        assignmentId: assignment.id,
        studentId: studentId,
        videoUrl: uploadResult.publicUrl,
        transcript: null
      }, recordedBlob, assignment.title)

      console.log(`Submission created with ID: ${submissionId}, status: ${status}`)

      // Step 3: Poll for completion with 15-second timeout
      const startTime = Date.now()
      const POLL_INTERVAL = 2000 // 2 seconds
      const REDIRECT_TIMEOUT = 15000 // 15 seconds

      const pollStatus = async () => {
        const elapsedTime = Date.now() - startTime

        // Trigger queue processor to process pending submissions
        triggerQueueProcessor().catch(() => {}) // Silent fail

        // Check if 15 seconds have elapsed
        if (elapsedTime >= REDIRECT_TIMEOUT) {
          console.log('15 seconds elapsed - processing still in progress')
          alert('Video submitted! Your speech is being analyzed in the background. Check back in a few minutes for your results.')
          setIsProcessing(false)
          onBack() // Return to assignment page
          return
        }

        // Poll for status
        const submissionStatus = await checkSubmissionStatus(submissionId)
        console.log(`Status check: ${submissionStatus.status} (elapsed: ${elapsedTime}ms)`)

        if (submissionStatus.status === 'completed') {
          // Fast path: Analysis completed within 15 seconds
          console.log('Analysis completed successfully!')
          alert('Video submitted and analyzed successfully! Your results are ready.')
          setIsProcessing(false)
          onBack() // Return to assignment page
          return
        }

        if (submissionStatus.status === 'failed') {
          // Processing failed
          console.error('Analysis failed:', submissionStatus.error_message)
          throw new Error(submissionStatus.error_message || 'Analysis failed')
        }

        // Still pending/processing - continue polling
        setTimeout(pollStatus, POLL_INTERVAL)
      }

      // Start the polling loop
      pollStatus()

    } catch (error) {
      console.error('Error submitting video:', error)
      alert(`Failed to submit video: ${error.message}. Please try again.`)
      setIsProcessing(false)
    }
  }

  return (
    <div className="recording-page rp-redesign">
      {/* Top navigation */}
      <div className="rp-top-nav">
        <button className="rp-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="m12 19-7-7 7-7"/>
          </svg>
          Back to Assignment
        </button>
      </div>

      {/* Header */}
      <div className="rp-header">
        <h2 className="rp-title">{assignment.title}</h2>
        <p className="rp-subtitle">Record your presentation for AI analysis</p>
      </div>

      {/* Main recording area */}
      <div className="rp-main">
        {/* Camera preview */}
        <div className="rp-camera-wrapper">
          <div className="rp-camera-container">
            <video 
              ref={videoRef}
              className="rp-camera-preview"
              autoPlay
              playsInline
              muted
            />
            {isRecording && (
              <div className="rp-recording-indicator">
                <div className="recording-dot"></div>
                <span>Recording...</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls directly under camera */}
        <div className="rp-controls">
          {!hasRecorded ? (
            <div className="rp-initial-controls">
              {!isRecording ? (
                <button 
                  className="rp-record-start-btn"
                  onClick={startRecording}
                  disabled={!mediaStream}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  Start Recording
                </button>
              ) : (
                <button 
                  className="rp-record-stop-btn"
                  onClick={stopRecording}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                  Stop Recording
                </button>
              )}
            </div>
          ) : (
            <div className="rp-post-controls">
              <button 
                className="rp-rerecord-btn"
                onClick={reRecord}
              >
                Re-record
              </button>
              <button 
                className="rp-submit-btn"
                onClick={sendForAnalysis}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="rp-spinner"></div>
                    Processing with AI...
                  </>
                ) : (
                  'Send for Analysis'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecordingPage
