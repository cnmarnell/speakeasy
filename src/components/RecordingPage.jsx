import { useState, useRef, useEffect } from 'react'
import { createSubmission } from '../data/supabaseData'

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
      // Create submission in Supabase without video URL (will be null until storage is implemented)
      const submission = await createSubmission({
        assignmentId: assignment.id,
        studentId: studentId,
        videoUrl: null,
        transcript: null
      })
      
      console.log('Submission created:', submission)
      alert('Video submitted successfully! You will receive feedback shortly.')
      
      // Return to assignment page
      onBack()
    } catch (error) {
      console.error('Error submitting video:', error)
      alert('Failed to submit video. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="recording-page">
      <div className="recording-header">
        <h2 className="recording-title">Record Assignment: {assignment.title}</h2>
        <p className="recording-description">Record your presentation for analysis</p>
      </div>

      <div className="camera-section">
        <div className="camera-container">
          <video 
            ref={videoRef}
            className="camera-preview"
            autoPlay
            playsInline
            muted
          />
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording...</span>
            </div>
          )}
        </div>
      </div>

      <div className="recording-controls">
        {!hasRecorded ? (
          <div className="initial-controls">
            {!isRecording ? (
              <button 
                className="record-start-btn"
                onClick={startRecording}
                disabled={!mediaStream}
              >
                Start Recording
              </button>
            ) : (
              <button 
                className="record-stop-btn"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            )}
          </div>
        ) : (
          <div className="post-recording-controls">
            <button 
              className="re-record-btn"
              onClick={reRecord}
            >
              Re-record
            </button>
            <button 
              className="send-analysis-btn"
              onClick={sendForAnalysis}
              disabled={isProcessing}
            >
              {isProcessing ? 'Sending...' : 'Send for Analysis'}
            </button>
          </div>
        )}
      </div>

      <button className="back-btn" onClick={onBack}>
        Back to Assignment
      </button>
    </div>
  )
}

export default RecordingPage