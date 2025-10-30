import { useState, useEffect } from 'react'

function VideoPlayer({ videoUrl, className = '' }) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [videoUrl])

  const handleVideoLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleVideoError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (!videoUrl) {
    return (
      <div className={`video-player-container ${className}`}>
        <div className="video-placeholder">
          <p>No video submitted yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`video-player-container ${className}`}>
      {isLoading && (
        <div className="video-loading">
          <p>Loading video...</p>
        </div>
      )}
      {hasError && (
        <div className="video-error">
          <p>Failed to load video</p>
        </div>
      )}
      <video 
        src={videoUrl}
        controls
        className="video-player"
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
        style={{ display: isLoading || hasError ? 'none' : 'block' }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

export default VideoPlayer