import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import StudentEvaluationCard from './StudentEvaluationCard'
import './RubricCalibrationModal.css'

const RubricCalibrationModal = ({ rubric, onClose }) => {
  const [transcript, setTranscript] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [error, setError] = useState('')
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [inputMode, setInputMode] = useState('paste') // 'paste' or 'record'
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunks = useRef([])

  useEffect(() => {
    return () => {
      // Clean up media stream when component unmounts
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaStream])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMediaStream(stream)

      recordedChunks.current = []
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(recordedChunks.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)

        // Clean up the stream
        stream.getTracks().forEach(track => track.stop())
        setMediaStream(null)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setError('')
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)
    setError('')

    try {
      // Call the transcribe endpoint
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await supabase.functions.invoke('transcribe', {
        method: 'POST',
        body: audioBlob,
        headers: {
          'Content-Type': 'audio/webm'
        }
      })

      if (response.error) {
        throw new Error(response.error.message || 'Transcription failed')
      }

      if (response.data?.transcript) {
        setTranscript(response.data.transcript)
      } else {
        throw new Error('No transcript returned')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setError('Failed to transcribe audio. Please try again or paste text manually.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleRunEvaluation = async () => {
    if (!transcript.trim()) {
      setError('Please enter a sample transcript to evaluate')
      return
    }

    setError('')
    setIsEvaluating(true)
    setEvaluationResult(null)

    try {
      const response = await supabase.functions.invoke('evaluate', {
        method: 'POST',
        body: {
          transcript: transcript.trim(),
          rubric_id: rubric.id,
          dry_run: true
        }
      })

      if (response.error) {
        throw new Error(response.error.message || 'Evaluation failed')
      }

      const data = response.data

      if (data.fallback) {
        setEvaluationResult({
          fallback: true,
          raw_response: data.raw_response || ''
        })
      } else {
        setEvaluationResult({
          criteria_scores: data.criteria_scores || [],
          total_score: data.total_score || 0,
          max_total_score: data.max_total_score || 0,
          overall_feedback: data.overall_feedback || '',
          improvement_suggestions: data.improvement_suggestions || '',
          fallback: false
        })
      }
    } catch (err) {
      console.error('Calibration error:', err)
      setError(err.message || 'Failed to run evaluation. Please try again.')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleClearResults = () => {
    setEvaluationResult(null)
    setError('')
  }

  return (
    <div className="calibration-modal-overlay" onClick={onClose}>
      <div className="calibration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calibration-modal-header">
          <div className="modal-header-content">
            <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <div>
              <h2 className="modal-title">Test Rubric</h2>
              <p className="modal-subtitle">Calibrate "{rubric?.name}" with sample responses</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="calibration-modal-body">
          <div className="transcript-section">
            <div className="input-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${inputMode === 'paste' ? 'active' : ''}`}
                onClick={() => setInputMode('paste')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                Paste Text
              </button>
              <button
                type="button"
                className={`mode-btn ${inputMode === 'record' ? 'active' : ''}`}
                onClick={() => setInputMode('record')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                Record Audio
              </button>
            </div>

            {inputMode === 'paste' ? (
              <>
                <label className="transcript-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Sample Transcript
                </label>
                <textarea
                  className="transcript-input"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Enter a sample speech transcript to test how this rubric evaluates it..."
                  rows={8}
                />
                <p className="transcript-hint">
                  Paste a sample student response here to see how the rubric evaluates it.
                  This is a dry run — no data will be saved.
                </p>
              </>
            ) : (
              <div className="recording-section">
                <div className="recording-controls">
                  {isRecording ? (
                    <button
                      type="button"
                      className="btn-stop-recording"
                      onClick={stopRecording}
                    >
                      <span className="recording-indicator"></span>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12"/>
                      </svg>
                      Stop Recording
                    </button>
                  ) : isTranscribing ? (
                    <div className="transcribing-status">
                      <span className="spinner-small"></span>
                      Transcribing audio...
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-start-recording"
                      onClick={startRecording}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                      Start Recording
                    </button>
                  )}
                </div>
                <p className="recording-hint">
                  Record a sample speech and it will be automatically transcribed for evaluation.
                </p>
                {transcript && (
                  <>
                    <label className="transcript-label">
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Transcribed Text (editable)
                    </label>
                    <textarea
                      className="transcript-input"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Transcribed text will appear here..."
                      rows={6}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="calibration-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="calibration-actions">
            {evaluationResult && (
              <button
                type="button"
                className="btn-clear"
                onClick={handleClearResults}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Clear Results
              </button>
            )}
            <button
              type="button"
              className="btn-evaluate"
              onClick={handleRunEvaluation}
              disabled={isEvaluating || !transcript.trim()}
            >
              {isEvaluating ? (
                <>
                  <span className="spinner-small"></span>
                  Evaluating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Run Evaluation
                </>
              )}
            </button>
          </div>

          {evaluationResult && (
            <div className="evaluation-results">
              <div className="results-header">
                <svg className="results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3 className="results-title">Evaluation Results</h3>
                <span className="dry-run-badge">Dry Run</span>
              </div>
              <StudentEvaluationCard evaluation={evaluationResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RubricCalibrationModal
