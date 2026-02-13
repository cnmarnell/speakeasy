// AWS Bedrock Agent analysis via Supabase Edge Function
import { supabase } from '../lib/supabase'
import { fetchWithRetry } from './apiResilience'

/**
 * Structured grading response format from the AI
 * @typedef {Object} GradingCriterion
 * @property {0|1} score - Binary score for the criterion
 * @property {string} explanation - Explanation for the score
 * 
 * @typedef {Object} StructuredGradingResponse
 * @property {GradingCriterion} context - Context/situation criterion
 * @property {GradingCriterion} action - Action taken criterion
 * @property {GradingCriterion} result - Result/outcome criterion
 * @property {GradingCriterion} quantitative - Quantitative data criterion
 * @property {number} total - Total score (0-4)
 * @property {string} improvement - How to improve the response
 * @property {string} example_perfect_response - Example of a perfect response
 */

// Analyze speech content using AWS Bedrock Agent
export const analyzeSpeechWithBedrockAgent = async (transcript, assignmentTitle, assignmentId = null) => {
  try {
    console.log('Analyzing speech with AWS Bedrock Agent...', {
      transcriptLength: transcript.length,
      assignment: assignmentTitle,
      assignmentId: assignmentId || 'none'
    })

    // Get user session for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('User session not found. Please ensure you are authenticated.')
    }

    // Get Supabase URL for the Bedrock Agent function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured')
    }

    const proxyUrl = `${supabaseUrl}/functions/v1/bedrock-agent`

    console.log('Calling Bedrock Agent function...')

    // RETRY LOGIC APPLIED: Wrap Bedrock Agent API call with retry mechanism
    // This handles 429 (rate limits) and 5xx errors with exponential backoff
    // TIMEOUT ADDED: 30-second timeout per attempt to prevent indefinite hangs
    const response = await fetchWithRetry(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      return fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          transcript: transcript,
          assignmentTitle: assignmentTitle,
          assignmentId: assignmentId
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
    }, { maxAttempts: 3 })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bedrock Agent API error:', response.status, errorText)
      throw new Error(`Bedrock Agent analysis failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    
    // Check if we have structured grading response
    const hasStructuredGrading = !!result.structuredGrading
    
    console.log('Bedrock Agent analysis successful:', {
      hasContent: !!result.speechContent,
      contentScore: result.contentScore,
      confidence: result.confidence,
      hasStructuredGrading: hasStructuredGrading,
      sourcesCount: result.sources?.length || 0
    })

    // Use the score from the structured response or fallback to contentScore
    const contentScore = typeof result.contentScore === 'number' ? result.contentScore : 2

    console.log('Using content score from AI:', {
      score: contentScore,
      source: hasStructuredGrading ? 'structured JSON' : (result.sources?.[0] || 'unknown'),
      structuredBreakdown: hasStructuredGrading ? {
        context: result.structuredGrading.context.score,
        action: result.structuredGrading.action.score,
        result: result.structuredGrading.result.score,
        quantitative: result.structuredGrading.quantitative.score
      } : null
    })

    // Return in the same format as other analysis functions for compatibility
    return {
      speechContent: result.speechContent || 'Analysis not available',
      confidence: result.confidence,
      sources: result.sources,
      overallScore: contentScore,
      contentOrganization: result.speechContent || 'Analysis not available',
      // Include structured grading data if available for detailed breakdowns
      structuredGrading: result.structuredGrading || null
    }
    
  } catch (error) {
    console.error('Bedrock Agent analysis error:', error)
    
    // Fallback to basic analysis if Bedrock Agent fails
    return generateBasicAnalysis(transcript, assignmentTitle)
  }
}

// Fallback analysis function
const generateBasicAnalysis = (transcript, assignmentTitle) => {
  console.log('Using fallback analysis due to Bedrock Agent error')
  
  const wordCount = transcript.split(' ').length
  const hasExamples = /for example|such as|for instance|specifically/i.test(transcript)
  const hasTransitions = /first|second|next|finally|in conclusion|however|furthermore/i.test(transcript)
  
  const speechContent = `Content Analysis for "${assignmentTitle}":

**Content Assessment:**
${wordCount > 150 ? '• Appropriate speech length with good detail' : '• Consider expanding with additional supporting details'}
${hasExamples ? '• Good use of examples and specifics' : '• Add concrete examples to strengthen your points'}
${hasTransitions ? '• Effective use of transition words' : '• Include transition words for smoother flow'}

**Recommendations:**
• Develop a clear thesis or main argument
• Support points with specific evidence or examples  
• Use signposting to guide your audience through your ideas
• Ensure each section connects to your overall message

**Strengths to Build On:**
• Clear communication style
• Focused on the assignment topic
• ${wordCount > 100 ? 'Substantial content development' : 'Concise delivery'}

This analysis provides basic feedback. For more detailed, AI-powered insights, ensure your Bedrock Agent configuration is properly set up.`

  return {
    speechContent: speechContent,
    confidence: 0.6,
    sources: ['Basic Analysis - Bedrock Agent Unavailable'],
    overallScore: 2, // Default to 2/4 (Average) when AI unavailable
    contentOrganization: 'Structure: Organize your speech with a strong opening that captures attention, well-developed main points with supporting evidence, and a memorable conclusion.',
    structuredGrading: null
  }
}

/**
 * Extract detailed criterion breakdown from structured grading
 * @param {Object} result - Analysis result with potential structuredGrading
 * @returns {Array|null} Array of criterion results or null
 */
export const getGradingBreakdown = (result) => {
  if (!result?.structuredGrading) return null
  
  const { structuredGrading } = result
  return [
    { name: 'Context', score: structuredGrading.context.score, explanation: structuredGrading.context.explanation },
    { name: 'Action', score: structuredGrading.action.score, explanation: structuredGrading.action.explanation },
    { name: 'Result', score: structuredGrading.result.score, explanation: structuredGrading.result.explanation },
    { name: 'Quantitative', score: structuredGrading.quantitative.score, explanation: structuredGrading.quantitative.explanation }
  ]
}

/**
 * Get improvement suggestions from structured grading
 * @param {Object} result - Analysis result with potential structuredGrading
 * @returns {string|null} Improvement suggestions or null
 */
export const getImprovementSuggestions = (result) => {
  return result?.structuredGrading?.improvement || null
}

/**
 * Get example perfect response from structured grading
 * @param {Object} result - Analysis result with potential structuredGrading
 * @returns {string|null} Example perfect response or null
 */
export const getExamplePerfectResponse = (result) => {
  return result?.structuredGrading?.example_perfect_response || null
}

// Test function for development
export const testBedrockAgentConnection = async () => {
  try {
    const testResult = await analyzeSpeechWithBedrockAgent(
      'This is a test speech about public speaking. It includes some examples and transitions.',
      'Test Assignment'
    )
    console.log('Bedrock Agent test successful:', testResult)
    return testResult
  } catch (error) {
    console.error('Bedrock Agent test failed:', error)
    return null
  }
}
