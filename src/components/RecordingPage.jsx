import { useState, useRef, useEffect } from 'react'
import { initiateSubmission, checkSubmissionStatus, uploadVideoToStorage, triggerQueueProcessor } from '../data/supabaseData'
import { useBodyLanguage } from '../hooks/useBodyLanguage'

function RecordingPage({ assignment, studentId, onBack }) {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [bodyLanguageResults, setBodyLanguageResults] = useState(null)
  
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunks = useRef([])
  const bodyLanguage = useBodyLanguage()

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      bodyLanguage.cleanup()
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
        // Wait for video to be playing before initializing tracker
        videoRef.current.onloadeddata = () => {
          console.log('Video loaded, initializing body language tracker...')
          bodyLanguage.initialize(videoRef.current)
        }
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
    bodyLanguage.startTracking()
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      bodyLanguage.stopTracking()
      const results = bodyLanguage.getResults()
      setBodyLanguageResults(results)
      console.log('Body language results:', results)
    }
  }

  const reRecord = () => {
    setHasRecorded(false)
    setRecordedBlob(null)
    setBodyLanguageResults(null)
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

      // Save eye contact score to grades table
      // Get results directly from the hook (not state, which clears on unmount)
      const blResults = bodyLanguageResults || bodyLanguage.getResults()
      if (blResults) {
        const eyeScore = blResults.eyeContact.score
        console.log('Saving eye contact score:', eyeScore, 'for submission:', submissionId)
        // Fire and forget - runs even after component unmounts
        const { supabase: sb } = await import('../lib/supabase')
        const saveScore = async () => {
          for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 4000))
            const { data, error } = await sb
              .from('grades')
              .update({ confidence_score: eyeScore })
              .eq('submission_id', submissionId)
              .select()
            console.log(`Eye contact save attempt ${i+1}:`, data?.length ? 'SUCCESS' : 'waiting...', error?.message || '')
            if (data && data.length > 0) return
          }
        }
        saveScore() // don't await - let it run in background
      }

      // Trigger queue processor multiple times to ensure grading starts
      // Then redirect immediately - assignment page polls for completion
      triggerQueueProcessor().catch(() => {})
      setTimeout(() => triggerQueueProcessor().catch(() => {}), 2000)
      setTimeout(() => triggerQueueProcessor().catch(() => {}), 5000)
      setTimeout(() => triggerQueueProcessor().catch(() => {}), 10000)

      console.log('Submission created, redirecting...')
      setIsProcessing(false)
      onBack()
      return

      /* Legacy polling code - keeping for reference
      const startTime = Date.now()
      const POLL_INTERVAL = 2000
      const REDIRECT_TIMEOUT = 15000

      const pollStatus = async () => {
        const elapsedTime = Date.now() - startTime
        triggerQueueProcessor().catch(() => {})

        if (elapsedTime >= REDIRECT_TIMEOUT) {
          setIsProcessing(false)
          onBack()
          return
        }

        const submissionStatus = await checkSubmissionStatus(submissionId)

        if (submissionStatus.status === 'completed') {
          setIsProcessing(false)
          onBack()
          return
        }

        if (submissionStatus.status === 'failed') {
          throw new Error(submissionStatus.error_message || 'Analysis failed')
        }

        setTimeout(pollStatus, POLL_INTERVAL)
      }

      pollStatus()
      */

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
            {isRecording && bodyLanguage.liveScore !== null && (
              <div className="rp-eye-contact-badge" style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: bodyLanguage.liveScore >= 70 ? 'rgba(34, 197, 94, 0.9)' : 
                            bodyLanguage.liveScore >= 40 ? 'rgba(234, 179, 8, 0.9)' : 
                            'rgba(239, 68, 68, 0.9)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.3s ease'
              }}>
                <span>👁</span>
                <span>Eye Contact: {bodyLanguage.liveScore}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Body language preview after recording */}
        {hasRecorded && bodyLanguageResults && (
          <div className="rp-body-language-preview" style={{
            background: 'rgba(139, 21, 56, 0.08)',
            border: '1px solid rgba(139, 21, 56, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: bodyLanguageResults.eyeContact.score >= 70 ? '#22c55e' :
                         bodyLanguageResults.eyeContact.score >= 40 ? '#eab308' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '18px',
              flexShrink: 0
            }}>
              {bodyLanguageResults.eyeContact.score}%
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1a1a2e', fontSize: '15px' }}>
                Eye Contact: {bodyLanguageResults.eyeContact.label}
              </div>
              <div style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>
                {bodyLanguageResults.eyeContact.score >= 70 
                  ? 'Great job maintaining eye contact with the camera!'
                  : bodyLanguageResults.eyeContact.score >= 40
                  ? 'Try to look at the camera more consistently.'
                  : 'Focus on looking directly at the camera while speaking.'}
              </div>
            </div>
          </div>
        )}

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
