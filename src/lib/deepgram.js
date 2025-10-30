// Direct Deepgram API calls using URL method (no SDK needed)

// Extract audio from video blob
const extractAudioFromVideo = async (videoBlob) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Extracting audio from video blob...')
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Create video element to load the blob
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoBlob)
      video.muted = true
      
      video.addEventListener('loadedmetadata', async () => {
        try {
          console.log('Video metadata loaded, duration:', video.duration)
          
          // Create media element source
          const source = audioContext.createMediaElementSource(video)
          
          // Create destination for recording
          const dest = audioContext.createMediaStreamDestination()
          source.connect(dest)
          
          // Create media recorder for audio
          const mediaRecorder = new MediaRecorder(dest.stream, {
            mimeType: 'audio/webm'
          })
          
          const audioChunks = []
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          }
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            console.log('Audio extracted successfully:', {
              size: audioBlob.size,
              type: audioBlob.type
            })
            URL.revokeObjectURL(video.src)
            resolve(audioBlob)
          }
          
          // Start recording and play video
          mediaRecorder.start()
          video.play()
          
          // Stop recording when video ends
          video.addEventListener('ended', () => {
            mediaRecorder.stop()
          })
          
        } catch (error) {
          console.error('Error in audio extraction:', error)
          URL.revokeObjectURL(video.src)
          reject(error)
        }
      })
      
      video.addEventListener('error', (error) => {
        console.error('Video load error:', error)
        URL.revokeObjectURL(video.src)
        reject(error)
      })
      
    } catch (error) {
      console.error('Error setting up audio extraction:', error)
      reject(error)
    }
  })
}

// Estimate audio duration based on file size (rough approximation)
const estimateDuration = (fileSizeBytes) => {
  // Rough estimate: WebM audio is typically around 16kbps
  // 1 second ≈ 2KB for compressed audio
  return Math.round(fileSizeBytes / 2000)
}

// Proxy API using Supabase Edge Function
const transcribeWithDeepgramProxy = async (videoBlob) => {
  try {
    console.log('=== DEEPGRAM PROXY API ===')
    
    // Get Supabase URL for the proxy function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured')
    }

    let audioBuffer
    
    try {
      // Try to extract audio from video first
      console.log('Extracting audio from video for proxy API...')
      const audioBlob = await extractAudioFromVideo(videoBlob)
      audioBuffer = await audioBlob.arrayBuffer()
    } catch (audioExtractionError) {
      console.warn('Audio extraction failed for proxy API, using video blob:', audioExtractionError.message)
      audioBuffer = await videoBlob.arrayBuffer()
    }

    console.log('Making proxy API call to Supabase Edge Function...')
    
    const proxyUrl = `${supabaseUrl}/functions/v1/deepgram-proxy`
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm'
        // Temporarily removing auth for local development
        // 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: audioBuffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Deepgram proxy API error:', response.status, errorText)
      throw new Error(`Deepgram proxy API failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Deepgram proxy API response:', result)

    if (!result.results?.channels?.[0]?.alternatives?.[0]) {
      throw new Error('Invalid response structure from Deepgram proxy API')
    }

    const transcript = result.results.channels[0].alternatives[0]
    
    return {
      text: transcript.transcript,
      duration: result.metadata?.duration || estimateDuration(videoBlob.size),
      language: 'en',
      confidence: transcript.confidence,
      words: transcript.words || []
    }
    
  } catch (error) {
    console.error('=== DEEPGRAM PROXY API ERROR ===')
    console.error('Error:', error)
    throw error
  }
}

// Direct Deepgram API call using URL method
const transcribeWithDeepgramDirect = async (videoUrl) => {
  try {
    console.log('=== DEEPGRAM DIRECT API TEST ===')
    console.log('Testing direct API call with URL:', videoUrl)
    
    // Validate API key
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY
    if (!apiKey) {
      throw new Error('Deepgram API key not configured')
    }

    // Direct API call following your research example
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&filler_words=true&punctuate=true&language=en-US', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: videoUrl
      })
    })

    console.log('Deepgram response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Deepgram API error:', response.status, errorText)
      throw new Error(`Deepgram API failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Deepgram direct API success!', result)

    // Parse response following your research example format
    const transcript = result.results.channels[0].alternatives[0]
    
    return {
      text: transcript.transcript,
      duration: result.metadata?.duration || 0,
      language: 'en',
      confidence: transcript.confidence,
      words: transcript.words || []
    }
    
  } catch (error) {
    console.error('=== DEEPGRAM DIRECT API ERROR ===')
    console.error('Error:', error.message)
    throw error
  }
}

// Main transcribe function - uploads to Supabase first, then uses URL
export const transcribeWithDeepgram = async (videoBlob, studentId = 'temp', assignmentId = 'temp') => {
  console.log('=== DEEPGRAM TRANSCRIPTION WITH SUPABASE URL ===')
  
  try {
    // First, upload video to Supabase Storage to get a URL
    console.log('Step 1: Uploading video to Supabase Storage...')
    
    // Import uploadVideoToStorage function - we'll need to import this
    // For now, let's create a simple upload here
    const { supabase } = await import('../lib/supabase')
    
    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `temp/${timestamp}.webm`
    
    // Upload video to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('speech-videos')
      .upload(fileName, videoBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'video/webm'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload video: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('speech-videos')
      .getPublicUrl(fileName)

    const videoUrl = urlData.publicUrl
    console.log('Step 2: Video uploaded successfully, URL:', videoUrl)
    
    // Now transcribe using the Supabase URL
    console.log('Step 3: Transcribing with Deepgram...')
    return await transcribeWithDeepgramDirect(videoUrl)
    
  } catch (error) {
    console.error('Transcription failed:', error.message)
    throw new Error(`Deepgram transcription failed: ${error.message}`)
  }
}

// URL transcription not implemented for proxy approach
// If needed, extend the proxy function to handle URLs