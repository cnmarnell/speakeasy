// Frame extraction utility for video body language analysis

/**
 * Extract frames from a video blob at specified intervals
 * @param {Blob} videoBlob - The video blob to extract frames from
 * @param {number} frameCount - Number of frames to extract (default: 4)
 * @returns {Promise<string[]>} Array of base64-encoded JPEG images
 */
export const extractFramesFromVideo = async (videoBlob, frameCount = 4) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const frames = []

    // Create object URL for the video blob
    video.src = URL.createObjectURL(videoBlob)
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = async () => {
      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const duration = video.duration

        console.log('Video metadata loaded:', {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: duration,
          frameCount: frameCount
        })

        // Calculate timestamps to extract frames at 20%, 40%, 60%, 80% of duration
        const percentages = Array.from(
          { length: frameCount },
          (_, i) => (i + 1) / (frameCount + 1)
        )
        const timestamps = percentages.map(pct => pct * duration)

        console.log('Extracting frames at timestamps:', timestamps)

        // Extract frames at each timestamp
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i]
          await seekToTime(video, timestamp)

          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to base64 JPEG (0.8 quality for reasonable size)
          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          frames.push(base64)

          console.log(`Extracted frame ${i + 1}/${frameCount} at ${timestamp.toFixed(2)}s`)
        }

        // Clean up object URL
        URL.revokeObjectURL(video.src)

        console.log(`Successfully extracted ${frames.length} frames`)
        resolve(frames)

      } catch (error) {
        URL.revokeObjectURL(video.src)
        reject(new Error(`Frame extraction failed: ${error.message}`))
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video for frame extraction'))
    }

    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (frames.length === 0) {
        URL.revokeObjectURL(video.src)
        reject(new Error('Frame extraction timed out after 30 seconds'))
      }
    }, 30000)
  })
}

/**
 * Helper function to seek video to a specific time
 * @param {HTMLVideoElement} video - The video element
 * @param {number} time - Time in seconds to seek to
 * @returns {Promise<void>}
 */
function seekToTime(video, time) {
  return new Promise((resolve) => {
    video.currentTime = time
    video.onseeked = () => resolve()
  })
}

/**
 * Test function for development
 */
export const testFrameExtraction = async (videoBlob) => {
  try {
    console.log('Testing frame extraction...')
    const frames = await extractFramesFromVideo(videoBlob, 4)
    console.log('Frame extraction test successful:', {
      frameCount: frames.length,
      averageSize: (frames.reduce((sum, f) => sum + f.length, 0) / frames.length / 1024).toFixed(2) + ' KB'
    })
    return frames
  } catch (error) {
    console.error('Frame extraction test failed:', error)
    return null
  }
}
