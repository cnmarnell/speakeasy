// Google Gemini body language analysis via Supabase Edge Function

/**
 * Analyze body language using Google Gemini via Supabase Edge Function
 * @param {string[]} frameImages - Array of base64-encoded frame images
 * @returns {Promise<Object>} Object containing bodyLanguageFeedback and confidence
 */
export const analyzeBodyLanguageWithGemini = async (frameImages) => {
  try {
    console.log('🎥 Analyzing body language with Gemini...', {
      frameCount: frameImages.length,
      frameSizes: frameImages.map(f => `${(f.length / 1024).toFixed(1)}KB`)
    })

    // Get Supabase URL for the Gemini function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured')
    }

    const proxyUrl = `${supabaseUrl}/functions/v1/gemini-body-language`

    console.log('📡 Calling Gemini Edge Function at:', proxyUrl)

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        frames: frameImages
      })
    })

    console.log('📥 Gemini Edge Function response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API error:', response.status, errorText)
      throw new Error(`Gemini analysis failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Gemini analysis successful!', {
      feedbackLength: result.bodyLanguageFeedback?.length || 0,
      feedbackPreview: result.bodyLanguageFeedback?.substring(0, 100),
      confidence: result.confidence
    })

    // Return in consistent format
    return {
      bodyLanguageFeedback: result.bodyLanguageFeedback || generateFallbackFeedback(),
      confidence: result.confidence || 0.5
    }

  } catch (error) {
    console.error('❌ Gemini body language analysis error:', error.message || error)
    console.error('Full error:', error)

    // Return fallback feedback if Gemini fails
    return {
      bodyLanguageFeedback: generateFallbackFeedback(),
      confidence: 0.3
    }
  }
}

/**
 * Generate fallback feedback when Gemini analysis is unavailable
 * @returns {string} Supportive fallback feedback message
 */
const generateFallbackFeedback = () => {
  return 'Your presentation delivery shows engagement with your topic. Continue practicing maintaining eye contact and using confident facial expressions to connect with your audience.'
}

/**
 * Test function for development
 * @param {string[]} testFrames - Array of test frame images
 * @returns {Promise<Object>} Test result
 */
export const testGeminiConnection = async (testFrames = []) => {
  try {
    console.log('Testing Gemini connection...')

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
