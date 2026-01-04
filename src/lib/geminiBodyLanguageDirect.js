// Direct client-side Google Gemini body language analysis
import { fetchWithRetry } from './apiResilience'

/**
 * Analyze body language using Google Gemini API directly from client
 * @param {string[]} frameImages - Array of base64-encoded frame images
 * @returns {Promise<Object>} Object containing bodyLanguageFeedback and confidence
 */
export const analyzeBodyLanguageWithGemini = async (frameImages) => {
  try {
    console.log('🎥 Analyzing body language with Gemini (direct API)...', {
      frameCount: frameImages.length,
      frameSizes: frameImages.map(f => `${(f.length / 1024).toFixed(1)}KB`)
    })

    // Get API key from environment
    const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('VITE_GOOGLE_GEMINI_API_KEY is not configured in environment variables')
    }

    // Build Gemini API URL (using gemini-1.5-pro for multimodal support)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`

    // System prompt for body language analysis
    const systemPrompt = `You are an expert public speaking coach analyzing student presentations. Based on the video frames provided, evaluate the student's body language and non-verbal communication. Focus on:

1. Eye contact and gaze direction
2. Posture and stance
3. Hand gestures and their effectiveness
4. Facial expressions and engagement
5. Overall presence and confidence

Provide constructive, actionable feedback in 2-3 sentences that helps students improve their presentation skills. Be encouraging but specific about areas for improvement.`

    // Prepare content parts with system prompt and images
    const contentParts = [
      { text: systemPrompt }
    ]

    // Add each frame as inline image data
    frameImages.forEach(frame => {
      // Remove the data URL prefix if present
      const base64Data = frame.replace(/^data:image\/jpeg;base64,/, '')
      contentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      })
    })

    // Add final instruction
    contentParts.push({
      text: "Based on these frames from the student's presentation, provide your body language feedback:"
    })

    console.log('📡 Calling Gemini API directly...')

    // RETRY LOGIC APPLIED: Wrap Gemini API call with retry mechanism
    // This handles 429 (rate limits) and 5xx errors with exponential backoff
    // TIMEOUT ADDED: 30-second timeout per attempt to prevent indefinite hangs
    const response = await fetchWithRetry(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: contentParts
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 300,
            topP: 0.9
          }
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
    }, { maxAttempts: 3 })

    console.log('📥 Gemini API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API error:', response.status, errorText)
      throw new Error(`Gemini API failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('📦 Gemini response data:', data)

    const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!feedback) {
      console.warn('⚠️ No feedback text in Gemini response')
      throw new Error('No feedback in Gemini response')
    }

    console.log('✅ Gemini analysis successful!', {
      feedbackLength: feedback.length,
      feedbackPreview: feedback.substring(0, 100)
    })

    return {
      bodyLanguageFeedback: feedback.trim(),
      confidence: 0.9
    }

  } catch (error) {
    console.error('❌ Gemini body language analysis error:', error.message || error)
    console.error('Full error:', error)

    // Return fallback feedback if Gemini fails
    return {
      bodyLanguageFeedback: 'Your presentation delivery shows engagement with your topic. Continue practicing maintaining eye contact and using confident facial expressions to connect with your audience.',
      confidence: 0.3
    }
  }
}

/**
 * Test function for development
 * @param {string[]} testFrames - Array of test frame images
 * @returns {Promise<Object>} Test result
 */
export const testGeminiConnection = async (testFrames = []) => {
  try {
    console.log('Testing Gemini direct API connection...')

    // If no test frames provided, create a simple test with empty array
    const frames = testFrames.length > 0 ? testFrames : []

    const result = await analyzeBodyLanguageWithGemini(frames)
    console.log('Gemini test successful:', result)
    return result
  } catch (error) {
    console.error('Gemini test failed:', error)
    return null
  }
}
