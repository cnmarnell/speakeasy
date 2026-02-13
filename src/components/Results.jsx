import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { checkSubmissionStatus } from '../data/supabaseData'
import StudentEvaluationCard from './StudentEvaluationCard'

export default function Results({ submissionId }) {
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState(null)
  const [grade, setGrade] = useState(null)
  const [evaluation, setEvaluation] = useState(null)
  const [pollingActive, setPollingActive] = useState(false)

  useEffect(() => {
    fetchResults()

    // Set up real-time listener for when grading completes
    const channel = supabase
      .channel('submission-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'submissions',
        filter: `id=eq.${submissionId}`
      }, (payload) => {
        console.log('Submission updated:', payload)
        // Listen for both 'completed' (new async flow) and 'graded' (old sync flow)
        if (payload.new.status === 'completed' || payload.new.status === 'graded') {
          fetchResults() // Refetch to get grade data
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [submissionId])

  // Polling effect for pending/processing states
  useEffect(() => {
    if (!submission) return

    // Only poll if status is pending or processing
    if (submission.status === 'pending' || submission.status === 'processing') {
      setPollingActive(true)

      const pollInterval = setInterval(async () => {
        try {
          const status = await checkSubmissionStatus(submissionId)

          if (status.status === 'completed' || status.status === 'graded') {
            clearInterval(pollInterval)
            setPollingActive(false)
            fetchResults() // Reload to get grade
          } else if (status.status === 'failed') {
            clearInterval(pollInterval)
            setPollingActive(false)
            setSubmission(status) // Update to show error
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(pollInterval)
    }
  }, [submission?.status, submissionId])

  const fetchResults = async () => {
    try {
      // Get submission
      const { data: sub, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single()

      if (subError) throw subError

      setSubmission(sub)

      // Fetch grade if status is 'completed' OR 'graded' (backwards compatibility)
      if (sub.status === 'completed' || sub.status === 'graded') {
        const { data: gradeData, error: gradeError } = await supabase
          .from('grades')
          .select(`
            *,
            feedback(
              speech_content_feedback,
              filler_words_feedback
            )
          `)
          .eq('submission_id', submissionId)
          .single()

        if (gradeError) throw gradeError

        // Flatten feedback into grade object for easier access
        const gradeWithFeedback = {
          ...gradeData,
          speech_content_feedback: gradeData.feedback?.[0]?.speech_content_feedback,
          filler_words_feedback: gradeData.feedback?.[0]?.filler_words_feedback
        }

        setGrade(gradeWithFeedback)
      }

      // Fetch rubric-based evaluation if available (for student_id linked to this submission)
      if (sub.student_id) {
        const { data: evalData, error: evalError } = await supabase
          .from('evaluations')
          .select(`
            *,
            evaluation_scores(
              id,
              criterion_id,
              score,
              max_score,
              feedback,
              rubric_criteria(
                id,
                name
              )
            )
          `)
          .eq('student_id', sub.student_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!evalError && evalData) {
          // Transform evaluation_scores to match StudentEvaluationCard expected format
          const criteriaScores = evalData.evaluation_scores?.map(es => ({
            criterion_id: es.criterion_id,
            criterion_name: es.rubric_criteria?.name || 'Unknown Criterion',
            score: es.score,
            max_score: es.max_score,
            feedback: es.feedback
          })) || []

          setEvaluation({
            criteria_scores: criteriaScores,
            total_score: evalData.total_score,
            max_total_score: evalData.max_total_score,
            overall_feedback: evalData.overall_feedback,
            improvement_suggestions: evalData.improvement_suggestions,
            fallback: evalData.is_fallback,
            raw_response: evalData.raw_response
          })
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching results:', error)
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <p className="text-center text-gray-600">Loading results...</p>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <p className="text-center text-red-600">Submission not found</p>
      </div>
    )
  }

  // Pending/Processing state (THE WAITING ROOM)
  if (submission.status === 'pending' || submission.status === 'processing') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        {/* Banner - Email notification message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                This is taking a bit longer than usual
              </h3>
              <p className="text-blue-700">
                Your submission is being processed. You can return to this page later to check the results.
              </p>
            </div>
          </div>
        </div>

        {/* Processing animation */}
        <div className="text-center py-12">
          <div className="relative inline-flex items-center justify-center mb-6">
            {/* Outer spinning ring */}
            <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-orange-600"></div>
            {/* Inner pulsing circle */}
            <div className="absolute animate-pulse rounded-full h-16 w-16 bg-orange-100"></div>
            {/* Icon */}
            <svg className="absolute w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-orange-600 mb-3">
            Analyzing Your Speech...
          </h2>

          <p className="text-gray-600 text-lg mb-4">
            Our AI is carefully reviewing your presentation
          </p>

          {/* Processing steps skeleton */}
          <div className="max-w-md mx-auto mt-8 space-y-3">
            <ProcessingStep
              icon="🎤"
              label="Transcribing audio"
              status={submission.status === 'processing' ? 'complete' : 'active'}
            />
            <ProcessingStep
              icon="📝"
              label="Analyzing speech content"
              status={submission.status === 'processing' ? 'active' : 'pending'}
            />
            <ProcessingStep
              icon="🎯"
              label="Detecting filler words"
              status="pending"
            />
            <ProcessingStep
              icon="👤"
              label="Evaluating body language"
              status="pending"
            />
          </div>

          {pollingActive && (
            <p className="text-sm text-gray-500 mt-6">
              Checking for updates every 3 seconds...
            </p>
          )}
        </div>
      </div>
    )
  }

  // Failed state
  if (submission.status === 'failed') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center text-red-600 py-12">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
          <p className="text-gray-600 mb-4">
            {submission.error_message || 'Something went wrong during analysis.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Return to Assignments
          </button>
        </div>
      </div>
    )
  }

  // Completed state - show grade (existing code)
  if (!grade) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <p className="text-center text-gray-600">No grade available yet.</p>
      </div>
    )
  }

  // Show results
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-orange-600 mb-6">
        Your Speech Results
      </h1>

      {/* Rubric-based Evaluation (if available) */}
      {evaluation && (
        <StudentEvaluationCard evaluation={evaluation} />
      )}

      {/* Score */}
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Total Score</p>
          <p className="text-6xl font-bold text-green-600">
            {grade?.total_score?.toFixed(0) || 0}
            <span className="text-3xl">/100</span>
          </p>
        </div>

        {/* Component Score Breakdown for Students */}
        {grade?.speech_content_score && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-sm text-gray-600 text-center mb-3">Score Breakdown (Weighted Average)</p>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="font-semibold text-gray-700">Speech Content (80%)</p>
                <p className="text-lg font-bold text-blue-600">{grade.speech_content_score}/{grade.content_score_max ?? 4}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Filler Words (20%)</p>
                <p className="text-lg font-bold text-orange-600">{grade.filler_word_score}/20</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filler Words */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-lg mb-2">Filler Words</h3>
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg">Count: {grade?.filler_word_count || 0}</span>
          <span className="text-lg font-bold text-blue-600">
            Score: {grade?.filler_word_score || Math.max(0, 20 - (grade?.filler_word_count || 0))}/20
          </span>
        </div>
        {grade?.filler_words_used && grade.filler_words_used.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-semibold mb-1">Detected words:</p>
            <div className="flex flex-wrap gap-2">
              {grade.filler_words_used.map((word, index) => {
                const count = grade?.filler_word_counts?.[word] || 1
                return (
                  <span key={index} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    {word} ({count}x)
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delivery & Language Analysis */}
      {/* Feedback */}
      {grade?.feedback && (
        <div className="space-y-4 mb-6">
          {/* Strengths */}
          {grade.feedback.strengths && grade.feedback.strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-bold text-lg text-green-800 mb-2">
                ✅ Strengths
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {grade.feedback.strengths.map((strength, idx) => (
                  <li key={idx} className="text-black">{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {grade.feedback.improvements && grade.feedback.improvements.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-bold text-lg text-orange-800 mb-2">
                💡 Areas for Improvement
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {grade.feedback.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-black">{improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {submission.transcript && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-2">📝 Transcript</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {submission.transcript}
          </p>
        </div>
      )}

      {/* Action */}
      <div className="mt-6 text-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 font-bold"
        >
          Submit Another Speech
        </button>
      </div>
    </div>
  )
}

// Helper component for processing steps
function ProcessingStep({ icon, label, status }) {
  const statusStyles = {
    complete: 'bg-green-100 border-green-300 text-green-800',
    active: 'bg-orange-100 border-orange-300 text-orange-800 animate-pulse',
    pending: 'bg-gray-100 border-gray-300 text-gray-500'
  }

  return (
    <div className={`flex items-center px-4 py-3 rounded-lg border-2 ${statusStyles[status]}`}>
      <span className="text-2xl mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
      {status === 'complete' && (
        <svg className="w-5 h-5 ml-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
        </svg>
      )}
    </div>
  )
}
