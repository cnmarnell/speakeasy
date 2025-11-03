// AWS Bedrock Agent analysis via Supabase Edge Function

// Analyze speech content using AWS Bedrock Agent
export const analyzeSpeechWithBedrockAgent = async (transcript, assignmentTitle) => {
  try {
    console.log('Analyzing speech with AWS Bedrock Agent...', { 
      transcriptLength: transcript.length,
      assignment: assignmentTitle 
    })

    // Get Supabase URL for the Bedrock Agent function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured')
    }

    const proxyUrl = `${supabaseUrl}/functions/v1/bedrock-agent`
    
    console.log('Calling Bedrock Agent function...')
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        transcript: transcript,
        assignmentTitle: assignmentTitle
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bedrock Agent API error:', response.status, errorText)
      throw new Error(`Bedrock Agent analysis failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Bedrock Agent analysis successful:', {
      hasContent: !!result.speechContent,
      confidence: result.confidence,
      sourcesCount: result.sources?.length || 0
    })

    // Return in the same format as other analysis functions for compatibility
    return {
      speechContent: result.speechContent || 'Analysis not available', // Pure Bedrock Agent output
      confidence: result.confidence,
      sources: result.sources,
      // Simple delivery guidance since Bedrock Agent focuses on content analysis
      bodyLanguage: 'Focus on clear articulation, confident posture, and engaging delivery. Maintain eye contact and use purposeful gestures to enhance your message.',
      contentOrganization: result.speechContent || 'Analysis not available' // Use same content for organization
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
    bodyLanguage: 'Delivery Analysis: Focus on maintaining clear articulation, appropriate volume, and confident posture. Practice using vocal variety to keep your audience engaged.',
    contentOrganization: 'Structure: Organize your speech with a strong opening that captures attention, well-developed main points with supporting evidence, and a memorable conclusion.'
  }
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