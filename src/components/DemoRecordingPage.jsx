import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initiateSubmission, checkSubmissionStatus, uploadVideoToStorage, triggerQueueProcessor, getAssignmentById } from '../data/supabaseData'
import './DemoRecordingPage.css'

// Demo configuration
const DEMO_ASSIGNMENT_ID = '71d3127c-11cc-4dec-ba8b-433185cad48a'
const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000de0'

function DemoRecordingPage() {
  const navigate = useNavigate()
  
  // Rate limit state
  const [rateLimit, setRateLimit] = useState({ allowed: true, remaining: 3, limit: 3, loading: true })
  
  // Assignment state
  const [assignment, setAssignment] = useState(null)
  const [assignmentLoading, setAssignmentLoading] = useState(true)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  
  // Results state
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState(null)
  
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunks = useRef([])

  // Check rate limit on mount
  useEffect(() => {
    checkRateLimit()
    loadAssignment()
  }, [])

  useEffect(() => {
    if (rateLimit.allowed && !rateLimit.loading) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [rateLimit.allowed, rateLimit.loading])

  const checkRateLimit = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/demo-rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'check' })
      })
      
      if (!response.ok) throw new Error('Rate limit check failed')
      
      const data = await response.json()
      setRateLimit({ ...data, loading: false })
    } catch (error) {
      console.error('Rate limit check error:', error)
      // Allow on error (fail open for better UX)
      setRateLimit({ allowed: true, remaining: 3, limit: 3, loading: false })
    }
  }

  const incrementRateLimit = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      await fetch(`${supabaseUrl}/functions/v1/demo-rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'increment' })
      })
    } catch (error) {
      console.error('Rate limit increment error:', error)
    }
  }

  const loadAssignment = async () => {
    try {
      const data = await getAssignmentById(DEMO_ASSIGNMENT_ID)
      setAssignment(data || { 
        id: DEMO_ASSIGNMENT_ID, 
        title: 'CAR Framework Practice',
        description: 'Practice the Context-Action-Result framework for behavioral interviews.'
      })
    } catch (error) {
      console.error('Error loading assignment:', error)
      setAssignment({ 
        id: DEMO_ASSIGNMENT_ID, 
        title: 'CAR Framework Practice',
        description: 'Practice the Context-Action-Result framework for behavioral interviews.'
      })
    } finally {
      setAssignmentLoading(false)
    }
  }

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
      const uploadResult = await uploadVideoToStorage(recordedBlob, DEMO_STUDENT_ID, DEMO_ASSIGNMENT_ID)
      console.log('Video uploaded successfully:', uploadResult)

      // Step 2: Initiate submission
      const { submissionId, status } = await initiateSubmission({
        assignmentId: DEMO_ASSIGNMENT_ID,
        studentId: DEMO_STUDENT_ID,
        videoUrl: uploadResult.publicUrl,
        transcript: null
      }, recordedBlob, assignment?.title || 'CAR Framework Practice')

      console.log(`Demo submission created with ID: ${submissionId}, status: ${status}`)

      // Step 3: Poll for completion with 30-second timeout (longer for demo)
      const startTime = Date.now()
      const POLL_INTERVAL = 2000
      const REDIRECT_TIMEOUT = 30000

      const pollStatus = async () => {
        const elapsedTime = Date.now() - startTime

        // Trigger queue processor
        triggerQueueProcessor().catch(() => {})

        if (elapsedTime >= REDIRECT_TIMEOUT) {
          console.log('30 seconds elapsed - processing still in progress')
          // Increment rate limit before showing message
          await incrementRateLimit()
          alert('Your speech is being analyzed! Results typically take 1-2 minutes. Sign up for a free account to see your full results.')
          setIsProcessing(false)
          return
        }

        const submissionStatus = await checkSubmissionStatus(submissionId)
        console.log(`Status check: ${submissionStatus.status} (elapsed: ${elapsedTime}ms)`)

        if (submissionStatus.status === 'completed') {
          console.log('Analysis completed!')
          // Increment rate limit
          await incrementRateLimit()
          
          // Fetch the results
          const { data: submissionData } = await supabase
            .from('submissions')
            .select(`
              transcript,
              grades(
                total_score,
                speech_content_score,
                filler_word_score,
                filler_word_count,
                filler_words_used,
                feedback(
                  speech_content_feedback,
                  filler_words_feedback
                )
              )
            `)
            .eq('id', submissionId)
            .single()

          if (submissionData) {
            const grade = submissionData.grades?.[0]
            const feedback = grade?.feedback?.[0]
            setResults({
              score: grade?.total_score || 0,
              transcript: submissionData.transcript,
              speechFeedback: feedback?.speech_content_feedback || 'Analysis complete.',
              fillerFeedback: feedback?.filler_words_feedback || 'No filler word issues detected.',
              fillerCount: grade?.filler_word_count || 0,
              fillerWords: grade?.filler_words_used || []
            })
            setShowResults(true)
          }
          
          setIsProcessing(false)
          return
        }

        if (submissionStatus.status === 'failed') {
          console.error('Analysis failed:', submissionStatus.error_message)
          throw new Error(submissionStatus.error_message || 'Analysis failed')
        }

        setTimeout(pollStatus, POLL_INTERVAL)
      }

      pollStatus()

    } catch (error) {
      console.error('Error submitting video:', error)
      alert(`Failed to analyze video: ${error.message}. Please try again.`)
      setIsProcessing(false)
    }
  }

  // Loading state
  if (rateLimit.loading || assignmentLoading) {
    return (
      <div className="demo-page">
        <div className="loading-container">
          <div className="demo-spinner"></div>
          <p>Loading demo...</p>
        </div>
      </div>
    )
  }

  // Rate limited state
  if (!rateLimit.allowed) {
    return (
      <div className="demo-page">
        <div className="demo-limit-reached">
          <div className="limit-icon">🎯</div>
          <h2>You've used all your demo recordings today!</h2>
          <p>You've completed {rateLimit.limit} demo recordings. Come back tomorrow or create a free account for unlimited access.</p>
          <div className="demo-cta-buttons">
            <button className="demo-signup-btn" onClick={() => navigate('/login')}>
              Create Free Account
            </button>
            <a href="/" className="demo-back-link">← Back to Home</a>
          </div>
        </div>
      </div>
    )
  }

  // Results state
  if (showResults && results) {
    return (
      <div className="demo-page">
        <div className="demo-results">
          <div className="results-header">
            <h2>🎉 Your Results</h2>
            <div className="score-badge">
              <span className="score-number">{results.score}</span>
              <span className="score-max">/100</span>
            </div>
          </div>

          <div className="results-section">
            <h3>📝 Content Feedback</h3>
            <p>{results.speechFeedback}</p>
          </div>

          <div className="results-section">
            <h3>🗣️ Filler Words</h3>
            <p>{results.fillerFeedback}</p>
            {results.fillerWords.length > 0 && (
              <div className="filler-words-list">
                Words detected: {results.fillerWords.join(', ')}
              </div>
            )}
          </div>

          {results.transcript && (
            <div className="results-section">
              <h3>📄 Transcript</h3>
              <div className="transcript-box">
                {results.transcript}
              </div>
            </div>
          )}

          <div className="demo-cta-section">
            <p className="cta-text">Want detailed feedback, progress tracking, and more?</p>
            <div className="demo-cta-buttons">
              <button className="demo-signup-btn" onClick={() => navigate('/login')}>
                Create Free Account
              </button>
              <button className="demo-retry-btn" onClick={() => {
                setShowResults(false)
                setResults(null)
                setHasRecorded(false)
                setRecordedBlob(null)
                checkRateLimit()
              }}>
                Try Again ({rateLimit.remaining - 1} left)
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Recording state
  return (
    <div className="demo-page">
      {/* Demo banner */}
      <div className="demo-banner">
        <span className="demo-badge">🎯 DEMO MODE</span>
        <span className="demo-remaining">{rateLimit.remaining} recordings remaining today</span>
      </div>

      {/* Header */}
      <div className="rp-header">
        <h2 className="rp-title">{assignment?.title || 'CAR Framework Practice'}</h2>
        <p className="rp-subtitle">Record a 30-60 second response using the Context-Action-Result framework</p>
        <p className="demo-prompt">
          <strong>Try this prompt:</strong> "Tell me about a time you worked on a team project."
        </p>
      </div>

      {/* Main recording area */}
      <div className="rp-main">
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

        {/* Controls */}
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
                    Analyzing with AI...
                  </>
                ) : (
                  'Get AI Feedback'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tips section */}
        <div className="demo-tips">
          <h4>💡 CAR Framework Tips:</h4>
          <ul>
            <li><strong>Context:</strong> Set the scene - when, where, what was the situation?</li>
            <li><strong>Action:</strong> What specific steps did YOU take?</li>
            <li><strong>Result:</strong> What was the outcome? Use numbers if possible!</li>
          </ul>
        </div>
      </div>

      {/* Back link */}
      <div className="demo-footer">
        <a href="/" className="demo-back-link">← Back to Home</a>
      </div>
    </div>
  )
}

export default DemoRecordingPage
