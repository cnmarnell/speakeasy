import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import StudentEvaluationCard from './StudentEvaluationCard'
import './RubricCalibrationModal.css'

const RubricCalibrationModal = ({ rubric, onClose }) => {
  const [transcript, setTranscript] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [error, setError] = useState('')
  const [evaluationResult, setEvaluationResult] = useState(null)

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
