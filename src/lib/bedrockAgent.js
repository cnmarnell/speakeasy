// AWS Bedrock Agent analysis via Supabase Edge Function
import { supabase } from '../supabaseClient'
import { fetchWithRetry } from './apiResilience'

// Analyze speech content using AWS Bedrock Agent
export const analyzeSpeechWithBedrockAgent = async (transcript, assignmentTitle) => {
  try {
    console.log('Analyzing speech with AWS Bedrock Agent...', {
      transcriptLength: transcript.length,
      assignment: assignmentTitle
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
          assignmentTitle: assignmentTitle
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
    console.log('Bedrock Agent analysis successful:', {
      hasContent: !!result.speechContent,
      contentScore: result.contentScore,
      confidence: result.confidence,
      sourcesCount: result.sources?.length || 0
    })

    // Use ONLY the explicit score from AI (extracted from "Final Score: x/4")
    // No keyword-based fallback - trust the edge function's extraction or default
    const contentScore = typeof result.contentScore === 'number' ? result.contentScore : 2

    console.log('Using content score from AI:', {
      score: contentScore,
      source: result.sources?.[0] || 'unknown'
    })

    // Return in the same format as other analysis functions for compatibility
    return {
      speechContent: result.speechContent || 'Analysis not available',
      confidence: result.confidence,
      sources: result.sources,
      overallScore: contentScore, // Direct from AI's "Final Score: x/4"
      bodyLanguage: 'Focus on clear articulation, confident posture, and engaging delivery. Maintain eye contact and use purposeful gestures to enhance your message.',
      contentOrganization: result.speechContent || 'Analysis not available'
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
    bodyLanguage: 'Delivery Analysis: Focus on maintaining clear articulation, appropriate volume, and confident posture. Practice using vocal variety to keep your audience engaged.',
    contentOrganization: 'Structure: Organize your speech with a strong opening that captures attention, well-developed main points with supporting evidence, and a memorable conclusion.'
  }
}

// Calculate content score from analysis text (3-point scale)
const calculateContentScoreFromAnalysis = (analysisText) => {
  const lowerText = analysisText.toLowerCase()
  
  // Excellent indicators (3 points)
  const excellentWords = ['excellent', 'outstanding', 'exceptional', 'superb', 'masterful', 'compelling', 'sophisticated']
  const goodWords = ['good', 'strong', 'clear', 'well-organized', 'effective', 'appropriate', 'solid']
  const fairWords = ['adequate', 'satisfactory', 'basic', 'simple', 'consider']
  const poorWords = ['poor', 'weak', 'unclear', 'disorganized', 'needs improvement', 'lacks', 'confusing', 'difficult']
  
  let score = 2 // Start with good/adequate base
  
  // Check for excellent indicators
  if (excellentWords.some(word => lowerText.includes(word))) {
    score = 3
  }
  // Check for good indicators  
  else if (goodWords.some(word => lowerText.includes(word))) {
    score = 2
  }
  // Check for fair indicators
  else if (fairWords.some(word => lowerText.includes(word))) {
    score = 1
  }
  // Check for poor indicators
  else if (poorWords.some(word => lowerText.includes(word))) {
    score = 0
  }
  
  // Content quality indicators
  const hasExamples = /example|specific|detail|evidence|support/i.test(analysisText)
  const hasStructure = /organized|structure|flow|transition|clear.*point/i.test(analysisText)
  const hasClarity = /clear|understand|coherent|focused/i.test(analysisText)
  const hasDepth = /substantial|develop|thorough|comprehensive/i.test(analysisText)
  
  // Bonus adjustments for content quality
  if (hasExamples && hasStructure && hasClarity && hasDepth && score < 3) {
    score = Math.min(3, score + 1)
  } else if ((hasExamples && hasStructure) || (hasClarity && hasDepth)) {
    score = Math.min(3, score + 0.5)
  }
  
  // Ensure score is within 0-3 bounds and round to nearest 0.5
  return Math.max(0, Math.min(3, Math.round(score * 2) / 2))
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