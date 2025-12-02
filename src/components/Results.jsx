import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Results({ submissionId }) {
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState(null)
  const [grade, setGrade] = useState(null)

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
        if (payload.new.status === 'graded') {
          fetchResults()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [submissionId])

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

      // If graded, get the grade with feedback
      if (sub.status === 'graded') {
        const { data: gradeData, error: gradeError } = await supabase
          .from('grades')
          .select(`
            *,
            feedback(
              body_language_feedback,
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
          body_language_feedback: gradeData.feedback?.[0]?.body_language_feedback,
          speech_content_feedback: gradeData.feedback?.[0]?.speech_content_feedback,
          filler_words_feedback: gradeData.feedback?.[0]?.filler_words_feedback
        }

        setGrade(gradeWithFeedback)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching results:', error)
      setLoading(false)
    }
  }

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

  if (submission.status === 'processing') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-orange-600 mb-2">
            AI is Grading Your Speech...
          </h2>
          <p className="text-gray-600">
            This usually takes 2-3 minutes. The page will update automatically!
          </p>
        </div>
      </div>
    )
  }

  if (submission.status === 'failed') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold mb-2">Grading Failed</h2>
          <p>Something went wrong. Please try submitting again.</p>
        </div>
      </div>
    )
  }

  // Show results
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-orange-600 mb-6">
        Your Speech Results
      </h1>

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
            <p className="text-sm text-gray-600 text-center mb-3">Score Breakdown (Simple Average)</p>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="font-semibold text-gray-700">Speech Content (50%)</p>
                <p className="text-lg font-bold text-blue-600">{grade.speech_content_score}/3</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Filler Words (50%)</p>
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
      {grade?.body_language_feedback && (
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-lg mb-2">📹 Delivery & Language Analysis</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {grade.body_language_feedback}
          </p>
        </div>
      )}

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
