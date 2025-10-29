import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function VideoRecorder({ assignmentId }) {
  const [recording, setRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const videoRef = useRef(null)
  const chunksRef = useRef([])

  // Ensure user is authenticated (anonymously) on component mount
  useEffect(() => {
    ensureAuth()
  }, [])

  const ensureAuth = async () => {
    try {
      // Check if user is already signed in
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Sign in anonymously
        console.log('No session found, signing in anonymously...')
        const { data, error } = await supabase.auth.signInAnonymously()
        
        if (error) {
          console.error('Anonymous sign-in error:', error)
          alert('Authentication failed. Please refresh the page.')
          return
        }
        
        console.log('Signed in anonymously:', data.user.id)
      } else {
        console.log('Already authenticated:', session.user.id)
      }
      
      setAuthReady(true)
    } catch (error) {
      console.error('Auth error:', error)
      alert('Authentication failed. Please refresh the page.')
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!authReady) {
      alert('Please wait, authentication is still loading...')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      videoRef.current.srcObject = stream
      videoRef.current.play()
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setVideoBlob(blob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }

      mediaRecorderRef.current.start()
      setRecording(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Please allow camera and microphone access')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  // Upload and submit
  const handleSubmit = async () => {
    if (!videoBlob || !authReady) return

    setUploading(true)

    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User error:', userError)
        alert('Authentication error. Please refresh the page.')
        setUploading(false)
        return
      }

      console.log('Uploading as user:', user.id)

      // Use student email if available, otherwise use anonymous identifier
      const userEmail = user.email || `anonymous-${user.id.slice(0, 8)}@vt.edu`

      // 1. Upload video to Storage
      const fileName = `${user.id}/${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('speech-videos')
        .upload(fileName, videoBlob, {
          contentType: 'video/webm',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }

      console.log('Upload successful:', uploadData)

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('speech-videos')
        .getPublicUrl(fileName)

      console.log('Video URL:', urlData.publicUrl)

      // 3. Create submission record
      const { data: submission, error: insertError } = await supabase
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          student_email: userEmail,
          video_url: urlData.publicUrl,
          status: 'processing'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        alert('Submission failed: ' + insertError.message)
        setUploading(false)
        return
      }

      console.log('Submission created:', submission)
      
      // Save submission ID to check results later
      setSubmissionId(submission.id)
      
      alert('Speech submitted! AI is grading... Check back in 2-3 minutes.')
      
      // Reset
      setVideoBlob(null)
      setUploading(false)

    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong: ' + error.message)
      setUploading(false)
    }
  }

  // Show loading state while auth is initializing
  if (!authReady) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-orange-600">
        Record Your Speech
      </h2>

      {/* Video preview */}
      <video 
        ref={videoRef}
        className="w-full mb-4 rounded bg-black"
        style={{ maxHeight: '400px' }}
      />

      {/* Show recorded video preview */}
      {videoBlob && !recording && (
        <video 
          src={URL.createObjectURL(videoBlob)} 
          controls 
          className="w-full mb-4 rounded"
        />
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!recording && !videoBlob && (
          <button 
            onClick={startRecording}
            className="flex-1 bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 font-bold"
          >
            🎥 Start Recording
          </button>
        )}

        {recording && (
          <button 
            onClick={stopRecording}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 font-bold"
          >
            ⏹️ Stop Recording
          </button>
        )}

        {videoBlob && !recording && (
          <>
            <button 
              onClick={() => setVideoBlob(null)}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700"
            >
              🔄 Re-record
            </button>
            <button 
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 font-bold disabled:opacity-50"
            >
              {uploading ? '⏳ Uploading...' : '✅ Submit Speech'}
            </button>
          </>
        )}
      </div>

      {/* Show submission ID for checking results */}
      {submissionId && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            ✅ Submission ID: <code>{submissionId}</code>
          </p>
          <p className="text-sm text-blue-600 mt-2">
            AI is processing your speech. Check the Results page in 2-3 minutes!
          </p>
        </div>
      )}
    </div>
  )
}
