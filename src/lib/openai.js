import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Enable client-side usage (for demo purposes)
})

// Convert video blob to audio for Whisper
export const extractAudioFromVideo = async (videoBlob) => {
  // For WebM videos, we can use the blob directly with Whisper
  // Whisper supports various formats including WebM
  return videoBlob
}

// Transcribe audio using OpenAI Whisper
export const transcribeWithWhisper = async (audioBlob) => {
  try {
    // Create a File object from the blob
    const audioFile = new File([audioBlob], 'speech.webm', { 
      type: 'video/webm' 
    })

    console.log('Sending audio to Whisper API...', {
      size: audioFile.size,
      type: audioFile.type
    })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Assuming English, can be made dynamic
      response_format: 'verbose_json' // Get detailed response with timestamps
    })

    return {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments || []
    }
  } catch (error) {
    console.error('Whisper transcription error:', error)
    throw new Error(`Transcription failed: ${error.message}`)
  }
}

// Analyze speech content using ChatGPT
export const analyzeSpeechWithChatGPT = async (transcript, assignmentTitle) => {
  try {
    console.log('Analyzing speech with ChatGPT...', { 
      transcriptLength: transcript.length,
      assignment: assignmentTitle 
    })

    const prompt = `
You are an expert speech communication instructor. Analyze the following student speech transcript and provide detailed feedback in three categories:

**Assignment**: ${assignmentTitle}
**Transcript**: "${transcript}"

Please provide specific, constructive feedback in these areas:

1. **Content & Organization**: Evaluate the structure, clarity of main points, supporting evidence, and overall coherence.

2. **Language & Delivery**: Assess word choice, grammar, flow, and verbal effectiveness.

3. **Speech Patterns**: Identify filler words, repetitive phrases, pacing issues, and suggest improvements.

For each category, provide:
- Specific strengths (what they did well)
- Areas for improvement (specific issues to address)
- Actionable suggestions (concrete steps to improve)

Keep feedback constructive, encouraging, and focused on growth. Limit each category to 2-3 sentences.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using cost-effective model
      messages: [
        {
          role: 'system',
          content: 'You are an expert speech communication instructor providing constructive feedback to students.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })

    const analysis = completion.choices[0].message.content

    // Parse the response to extract feedback categories
    return parseFeedbackResponse(analysis)
  } catch (error) {
    console.error('ChatGPT analysis error:', error)
    throw new Error(`Speech analysis failed: ${error.message}`)
  }
}

// Parse ChatGPT response into structured feedback
const parseFeedbackResponse = (response) => {
  // Default fallback structure
  const defaultFeedback = {
    speechContent: response.substring(0, 200) + '...',
    fillerWords: 'Analysis of filler words and speech patterns completed.',
    overallScore: 85 // Default score
  }

  try {
    // Try to extract structured feedback from the response
    const contentMatch = response.match(/Content & Organization[:\s]*(.*?)(?=Language & Delivery|$)/is)
    const languageMatch = response.match(/Language & Delivery[:\s]*(.*?)(?=Speech Patterns|$)/is)
    const patternsMatch = response.match(/Speech Patterns[:\s]*(.*?)$/is)

    return {
      speechContent: contentMatch ? contentMatch[1].trim() : defaultFeedback.speechContent,
      fillerWords: patternsMatch ? patternsMatch[1].trim() : defaultFeedback.fillerWords,
      bodyLanguage: languageMatch ? languageMatch[1].trim() : 'Language and delivery analysis completed.',
      overallScore: calculateScoreFromFeedback(response)
    }
  } catch (error) {
    console.warn('Failed to parse feedback response, using default structure')
    return defaultFeedback
  }
}

// Calculate score based on feedback sentiment
const calculateScoreFromFeedback = (feedback) => {
  const lowerFeedback = feedback.toLowerCase()
  
  // Positive indicators
  const positiveWords = ['excellent', 'outstanding', 'great', 'strong', 'clear', 'well-organized', 'effective']
  const negativeWords = ['poor', 'weak', 'unclear', 'disorganized', 'needs improvement', 'lacks']
  
  let score = 80 // Base score
  
  positiveWords.forEach(word => {
    if (lowerFeedback.includes(word)) score += 3
  })
  
  negativeWords.forEach(word => {
    if (lowerFeedback.includes(word)) score -= 5
  })
  
  // Ensure score is within reasonable bounds
  return Math.max(65, Math.min(98, score))
}

export { openai }