import { supabase } from '../lib/supabase'
import { transcribeWithDeepgram } from '../lib/deepgram'
import { analyzeSpeechWithBedrockAgent } from '../lib/bedrockAgent'
import { analyzeFillerWords, getFillerWordScore } from '../lib/fillerWordAnalysis'
import { extractFramesFromVideo } from '../lib/frameExtraction'
import { analyzeBodyLanguageWithGemini } from '../lib/geminiBodyLanguageDirect'

// Create user profile in students or teachers table after signup
export const createUserProfile = async (email, name, accountType) => {
  const table = accountType === 'teacher' ? 'teachers' : 'students'

  const { data, error } = await supabase
    .from(table)
    .insert([{ email, name }])
    .select()
    .single()

  if (error) {
    console.error(`Error creating ${accountType} profile:`, error)
    throw error
  }

  return data
}

// Fetch all classes for teacher dashboard
export const getClasses = async () => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching classes:', error)
    return []
  }
  
  return data
}

// Fetch assignments for a specific class
export const getAssignmentsByClass = async (className) => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      classes!inner(name)
    `)
    .eq('classes.name', className)
    .order('due_date', { ascending: true }) // Sort by due date, soonest first
  
  if (error) {
    console.error('Error fetching assignments:', error)
    return []
  }
  
  return data.map(assignment => ({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    status: assignment.status || '',
    dueDate: new Date(assignment.due_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    rawDueDate: assignment.due_date // Keep raw date for sorting
  }))
}

// Fetch students enrolled in a specific class
export const getStudentsByClass = async (className) => {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      name,
      email,
      class_enrollments!inner(
        classes!inner(name)
      ),
      submissions(
        grades(
          total_score
        )
      )
    `)
    .eq('class_enrollments.classes.name', className)
    .order('name')

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }

  // Client-side aggregation to calculate average grades
  return data.map(student => {
    // Extract all grade scores from submissions
    const grades = student.submissions
      .map(sub => sub.grades?.[0]?.total_score)
      .filter(score => score != null)

    // Handle students with no submissions
    if (grades.length === 0) {
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        overallGrade: 'N/A',
        totalPoints: '0/100',
        submissionCount: 0,
        lastActivity: ''
      }
    }

    // Calculate average grade
    const totalPoints = grades.reduce((sum, score) => sum + score, 0)
    const average = Math.round(totalPoints / grades.length)

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      overallGrade: getLetterGrade(average),
      totalPoints: `${average}/100`,
      submissionCount: grades.length,
      lastActivity: ''
    }
  })
}

// Fetch student grades by student ID
export const getStudentGrades = async (studentId) => {
  const { data, error } = await supabase
    .from('grades')
    .select(`
      *,
      submissions!inner(
        student_id,
        assignments(id, title)
      )
    `)
    .eq('submissions.student_id', studentId)
  
  if (error) {
    console.error('Error fetching student grades:', error)
    return []
  }
  
  return data.map(grade => ({
    assignmentId: grade.submissions.assignments.id,
    assignmentName: grade.submissions.assignments.title,
    grade: getLetterGrade(grade.total_score),
    points: grade.total_score || 0,
    status: "Graded"
  }))
}

// Fetch student progress for a specific assignment
export const getStudentProgressForAssignment = async (assignmentId) => {
  // First get all students who should have this assignment (enrolled in the class)
  const { data: assignment } = await supabase
    .from('assignments')
    .select('class_id')
    .eq('id', assignmentId)
    .single()
  
  if (!assignment) return []
  
  const { data: enrolledStudents } = await supabase
    .from('students')
    .select(`
      id,
      name,
      email,
      class_enrollments!inner(class_id)
    `)
    .eq('class_enrollments.class_id', assignment.class_id)
  
  // Get submissions and grades for this assignment
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      student_id,
      status,
      grades(total_score)
    `)
    .eq('assignment_id', assignmentId)
  
  // Combine the data
  return enrolledStudents.map(student => {
    const submission = submissions?.find(s => s.student_id === student.id)
    const grade = submission?.grades?.[0]
    
    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      status: submission ? (submission.status === 'graded' ? 'Finished' : 'In Progress') : 'Not Started',
      grade: grade ? getLetterGrade(grade.total_score) : 'N/A',
      points: grade ? `${grade.total_score}/100` : '0/100'
    }
  })
}

// Fetch assignment feedback for a specific student
export const getAssignmentFeedback = async (assignmentId, studentId = null) => {
  let query = supabase
    .from('feedback')
    .select(`
      *,
      grades!inner(
        submissions!inner(assignment_id, student_id, transcript, submitted_at)
      )
    `)
    .eq('grades.submissions.assignment_id', assignmentId)
  
  if (studentId) {
    query = query.eq('grades.submissions.student_id', studentId)
  }
  
  const { data, error } = await query.limit(1)
  
  if (error || !data.length) {
    return {
      fillerWords: "No feedback available yet.",
      speechContent: "No feedback available yet.",
      bodyLanguage: "No feedback available yet.",
      transcript: "No transcript available yet.",
      submittedAt: null
    }
  }
  
  const feedback = data[0]
  const submission = feedback.grades.submissions
  
  return {
    fillerWords: feedback.filler_words_feedback || "No feedback available yet.",
    speechContent: feedback.speech_content_feedback || "No feedback available yet.",
    bodyLanguage: feedback.body_language_feedback || "No feedback available yet.",
    transcript: submission.transcript || "No transcript available yet.",
    submittedAt: submission.submitted_at
  }
}

// Get detailed feedback for teachers (includes everything)
export const getDetailedStudentFeedback = async (assignmentId, studentId) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        video_url,
        transcript,
        status,
        submitted_at,
        students(id, name, email),
        assignments(id, title, description),
        grades(
          id,
          total_score,
          speech_content_score,
          content_score_max,
          filler_word_count,
          filler_words_used,
          filler_words_per_minute,
          filler_category_breakdown,
          filler_word_score,
          filler_word_counts,
          graded_at,
          feedback(
            filler_words_feedback,
            speech_content_feedback,
            body_language_feedback
          )
        )
      `)
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .single()

    if (error || !data) {
      return null
    }

    const submission = data
    const grade = submission.grades?.[0]
    const feedback = grade?.feedback?.[0]

    return {
      // Student info
      student: {
        id: submission.students.id,
        name: submission.students.name,
        email: submission.students.email
      },
      
      // Assignment info
      assignment: {
        id: submission.assignments.id,
        title: submission.assignments.title,
        description: submission.assignments.description
      },
      
      // Submission details
      submission: {
        id: submission.id,
        videoUrl: submission.video_url,
        transcript: submission.transcript,
        status: submission.status,
        submittedAt: submission.submitted_at
      },
      
      // Grade details
      grade: grade ? {
        totalScore: grade.total_score,
        speechContentScore: grade.speech_content_score,
        contentScoreMax: grade.content_score_max || 4,
        fillerWordCount: grade.filler_word_count,
        fillerWordsUsed: grade.filler_words_used || [],
        fillersPerMinute: grade.filler_words_per_minute || 0,
        categoryBreakdown: grade.filler_category_breakdown || {},
        fillerWordScore: grade.filler_word_score || Math.max(0, 20 - (grade.filler_word_count || 0)),
        fillerWordCounts: grade.filler_word_counts || {},
        gradedAt: grade.graded_at,
        letterGrade: getLetterGrade(grade.total_score)
      } : null,
      
      // Feedback details
      feedback: feedback ? {
        fillerWords: feedback.filler_words_feedback,
        speechContent: feedback.speech_content_feedback,
        bodyLanguage: feedback.body_language_feedback
      } : null
    }
  } catch (error) {
    console.error('Error fetching detailed student feedback:', error)
    return null
  }
}

// Helper function to convert percentage to letter grade
const getLetterGrade = (percentage) => {
  if (percentage >= 97) return "A+"
  if (percentage >= 93) return "A"
  if (percentage >= 90) return "A-"
  if (percentage >= 87) return "B+"
  if (percentage >= 83) return "B"
  if (percentage >= 80) return "B-"
  if (percentage >= 77) return "C+"
  if (percentage >= 73) return "C"
  if (percentage >= 70) return "C-"
  if (percentage >= 67) return "D+"
  if (percentage >= 63) return "D"
  if (percentage >= 60) return "D-"
  return "F"
}

// Legacy compatibility functions to match existing mockData exports
export const assignments = [] // Will be populated dynamically
export const classes = [] // Will be populated dynamically  
export const students = [] // Will be populated dynamically

// Utility functions (keeping the same API as mockData)
export const getAssignmentById = async (id) => {
  const { data } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single()
  
  return data ? {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status || '',
    dueDate: new Date(data.due_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    }),
    rawDueDate: data.due_date // Add raw due date for comparison
  } : null
}

export const getStudentById = async (id) => {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()
  
  return data
}

export const getClassByName = async (name) => {
  const { data } = await supabase
    .from('classes')
    .select('*')
    .eq('name', name)
    .single()
  
  return data
}

export const getStudentGradesById = async (studentId) => {
  return await getStudentGrades(studentId)
}

export const getStudentAssignmentStatus = async (studentId, assignmentId) => {
  const { data } = await supabase
    .from('submissions')
    .select('status')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
    .single()

  if (!data) return "Not Started"

  switch (data.status) {
    case 'completed': return "In Progress" // NEW: Async flow completion
    case 'graded': return "In Progress" // OLD: Sync flow completion
    case 'pending': return "Processing..." // NEW: Queued for processing
    case 'processing': return "Processing..." // NEW: Currently analyzing
    case 'failed': return "Failed"
    default: return "Not Started"
  }
}

// VIDEO STORAGE FUNCTIONS

/**
 * Generate a presigned upload URL for direct client-to-storage uploads
 * This eliminates the "double tax" of routing video through your backend
 *
 * @param {string} studentId - Student identifier
 * @param {string} assignmentId - Assignment identifier
 * @returns {Promise<{uploadUrl: string, filePath: string, token: string}>}
 */
export const generatePresignedUploadUrl = async (studentId, assignmentId) => {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileName = `${studentId}/${assignmentId}/${timestamp}.webm`

    // Create a presigned upload URL (valid for 10 minutes)
    const { data, error } = await supabase.storage
      .from('speech-videos')
      .createSignedUploadUrl(fileName, {
        upsert: false
      })

    if (error) {
      console.error('Failed to create presigned upload URL:', error)
      throw new Error(`Presigned URL generation failed: ${error.message}`)
    }

    console.log('✅ Generated presigned upload URL for direct client upload')

    return {
      uploadUrl: data.signedUrl,
      filePath: fileName,
      token: data.token
    }
  } catch (error) {
    console.error('Error generating presigned upload URL:', error)
    throw error
  }
}

/**
 * Upload video to Supabase Storage (traditional method)
 * IMPROVED: Enhanced error handling with retry capability
 *
 * NOTE: For production at scale, use generatePresignedUploadUrl() instead
 * to enable direct client-to-storage uploads and avoid backend bottlenecks
 *
 * @param {Blob} videoBlob - The video file to upload
 * @param {string} studentId - Student identifier
 * @param {string} assignmentId - Assignment identifier
 * @returns {Promise<{path: string, publicUrl: string}>}
 */
export const uploadVideoToStorage = async (videoBlob, studentId, assignmentId) => {
  try {
    // Validate input
    if (!videoBlob || videoBlob.size === 0) {
      throw new Error('Video blob is empty or invalid')
    }

    if (!studentId || !assignmentId) {
      throw new Error('Student ID and Assignment ID are required')
    }

    // Check video size (warn if > 50MB)
    const sizeMB = videoBlob.size / (1024 * 1024)
    if (sizeMB > 50) {
      console.warn(`⚠️  Large video upload (${sizeMB.toFixed(2)}MB). Consider implementing chunked uploads.`)
    }

    console.log(`📤 Uploading video: ${sizeMB.toFixed(2)}MB`)

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileName = `${studentId}/${assignmentId}/${timestamp}.webm`

    // Upload video to storage bucket with retry logic
    let uploadAttempt = 0
    const maxUploadAttempts = 2
    let uploadError = null

    while (uploadAttempt < maxUploadAttempts) {
      const { data, error } = await supabase.storage
        .from('speech-videos')
        .upload(fileName, videoBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'video/webm'
        })

      if (!error) {
        // Upload succeeded
        console.log(`✅ Video uploaded successfully: ${fileName}`)

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('speech-videos')
          .getPublicUrl(fileName)

        if (!urlData || !urlData.publicUrl) {
          throw new Error('Failed to generate public URL for uploaded video')
        }

        return {
          path: data.path,
          publicUrl: urlData.publicUrl
        }
      }

      // Upload failed - check if retryable
      uploadError = error
      uploadAttempt++

      // Check for specific error types
      if (error.message?.includes('already exists')) {
        // File collision - regenerate filename and retry
        console.warn(`⚠️  File collision detected. Regenerating filename...`)
        const newTimestamp = Date.now() + uploadAttempt
        const newFileName = `${studentId}/${assignmentId}/${newTimestamp}.webm`
        continue
      }

      if (error.message?.includes('quota') || error.message?.includes('storage limit')) {
        // Storage quota exceeded - don't retry
        console.error('❌ Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please contact support.')
      }

      if (uploadAttempt < maxUploadAttempts) {
        console.warn(`⚠️  Upload attempt ${uploadAttempt} failed. Retrying...`, error)
        await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempt))
      }
    }

    // All upload attempts failed
    console.error('❌ Video upload failed after retries:', uploadError)
    throw new Error(`Video upload failed: ${uploadError?.message || 'Unknown error'}`)

  } catch (error) {
    console.error('❌ Error in uploadVideoToStorage:', error)

    // Provide user-friendly error messages
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('Storage limit reached. Please contact your administrator.')
    }

    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      throw new Error('Network error during upload. Please check your connection and try again.')
    }

    throw error
  }
}

// Get signed URL for private video access (future use)
export const getVideoSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from('speech-videos')
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      throw error
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error creating signed URL:', error)
    throw error
  }
}

// Get video URL from submission
export const getSubmissionVideoUrl = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('video_url')
      .eq('id', submissionId)
      .single()

    if (error) {
      throw error
    }

    return data.video_url
  } catch (error) {
    console.error('Error fetching submission video URL:', error)
    return null
  }
}

// AI ANALYSIS FUNCTIONS

// Process video with AI analysis
export const processVideoWithAI = async (videoBlob, assignmentTitle) => {
  try {
    console.log('Starting AI analysis pipeline...')
    
    // Step 1: Transcribe audio with Deepgram (testing direct API)
    console.log('Step 1: Transcribing audio...')
    const transcriptionResult = await transcribeWithDeepgram(videoBlob)

    // CRITICAL: Check if transcription succeeded before continuing
    if (!transcriptionResult || !transcriptionResult.text) {
      throw new Error('Transcription failed: No transcript returned from Deepgram')
    }

    // Step 2: Analyze filler words in transcript
    console.log('Step 2: Analyzing filler words...')
    const fillerAnalysis = analyzeFillerWords(transcriptionResult.text)
    
    // Step 3: Analyze speech content with AWS Bedrock Agent
    console.log('Step 3: Analyzing speech content with Bedrock Agent...')
    const analysisResult = await analyzeSpeechWithBedrockAgent(
      transcriptionResult.text,
      assignmentTitle
    )

    // Step 4: Analyze body language with Google Gemini
    console.log('Step 4: Analyzing body language with Gemini...')
    let bodyLanguageFeedback = 'Body language analysis will be available soon.'
    try {
      const frames = await extractFramesFromVideo(videoBlob, 4)
      console.log('Extracted frames for Gemini analysis:', frames.length)
      const geminiResult = await analyzeBodyLanguageWithGemini(frames)
      console.log('Gemini analysis result:', geminiResult)
      bodyLanguageFeedback = geminiResult.bodyLanguageFeedback
      console.log('Body language feedback set to:', bodyLanguageFeedback)
    } catch (error) {
      console.error('Body language analysis error:', error)
      // Keep default fallback feedback
    }

    // Combine filler word analysis with Bedrock Agent analysis and body language
    // IMPORTANT: bodyLanguage must come AFTER the spread to override Bedrock's placeholder
    const enhancedAnalysis = {
      ...analysisResult,
      fillerWords: fillerAnalysis.analysis,
      fillerWordData: fillerAnalysis,
      bodyLanguage: bodyLanguageFeedback  // This overrides analysisResult.bodyLanguage
    }

    console.log('Enhanced analysis with Gemini body language:', enhancedAnalysis.bodyLanguage)
    
    return {
      transcript: transcriptionResult.text,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
      analysis: {
        ...enhancedAnalysis,
        overallScore: enhancedAnalysis.overallScore ?? 2 // Use ?? to allow 0 (|| treats 0 as falsy!)
      },
      fillerWordAnalysis: fillerAnalysis,
      // If we got the placeholder, let's reflect that it wasn't a full AI process
      aiProcessed: analysisResult.speechContent !== "We are fixing this."
    }
  } catch (error) {
    console.error('❌ AI processing failed:', error)

    // Check if this is a critical error that should propagate
    const errorMessage = error.message || error.toString() || ''
    const errorStack = error.stack || ''

    console.log('🔍 Error analysis:', {
      message: errorMessage,
      hasAuth: errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('AUTH_ERROR'),
      hasRateLimit: errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED'),
      hasConfig: errorMessage.includes('API key') || errorMessage.includes('not configured')
    })

    // Authentication/configuration errors should fail immediately
    if (errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('AUTH_ERROR') ||
        errorMessage.includes('API key') ||
        errorMessage.includes('not configured') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('Invalid API')) {
      console.error('🚨 AUTHENTICATION ERROR DETECTED - Propagating to user')
      throw new Error(`Configuration error: ${errorMessage}. Please check your API keys.`)
    }

    // Rate limiting should propagate with specific message
    if (errorMessage.includes('429') ||
        errorMessage.includes('RATE_LIMITED') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Too Many Requests')) {
      console.error('🚨 RATE LIMIT ERROR DETECTED - Propagating to user')
      throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again in a few minutes.`)
    }

    // Transcription failures should also propagate
    if (errorMessage.includes('Transcription failed') ||
        errorMessage.includes('Deepgram') ||
        errorMessage.includes('No transcript')) {
      console.error('🚨 TRANSCRIPTION ERROR DETECTED - Propagating to user')
      throw new Error(`Transcription error: ${errorMessage}`)
    }

    // Transient errors (5xx, network) can use fallback
    console.warn('Using fallback analysis due to transient error')
    const fallbackFillerAnalysis = analyzeFillerWords('') // Empty analysis

    return {
      transcript: 'AI transcription temporarily unavailable. Please try again.',
      duration: null,
      language: 'en',
      analysis: {
        speechContent: 'Temporary service interruption. Your submission has been recorded.',
        fillerWords: 'Analysis will be available when AI services are restored.',
        bodyLanguage: 'Analysis will be available when AI services are restored.',
        overallScore: null // Don't generate a grade for failed analysis
      },
      fillerWordAnalysis: fallbackFillerAnalysis,
      aiProcessed: false,
      error: error.message,
      errorType: 'TRANSIENT_FAILURE'
    }
  }
}

// CREATE FUNCTIONS

// Create a new assignment
export const createAssignment = async (assignmentData) => {
  try {
    // First get the class ID by name
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('name', assignmentData.className)
      .single()
    
    if (classError || !classData) {
      throw new Error('Class not found')
    }

    // Create the assignment
    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        class_id: classData.id,
        title: assignmentData.title,
        description: assignmentData.description,
        max_duration_seconds: assignmentData.maxDuration || 60,
        due_date: assignmentData.dueDate
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error creating assignment:', error)
    throw error
  }
}

// Delete an assignment and all related data
export const deleteAssignment = async (assignmentId) => {
  try {
    console.log('Deleting assignment:', assignmentId)
    
    // Delete in order due to foreign key constraints:
    // Step 1: Get all submissions for this assignment
    const { data: submissions, error: submissionsSelectError } = await supabase
      .from('submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
    
    if (submissionsSelectError) {
      console.error('Error fetching submissions:', submissionsSelectError)
      throw submissionsSelectError
    }
    
    console.log('Found submissions:', submissions?.length || 0)
    
    if (submissions && submissions.length > 0) {
      const submissionIds = submissions.map(s => s.id)
      
      // Step 2: Get all grades for these submissions
      const { data: grades, error: gradesSelectError } = await supabase
        .from('grades')
        .select('id')
        .in('submission_id', submissionIds)
      
      if (gradesSelectError) {
        console.error('Error fetching grades:', gradesSelectError)
        throw gradesSelectError
      }
      
      console.log('Found grades:', grades?.length || 0)
      
      if (grades && grades.length > 0) {
        const gradeIds = grades.map(g => g.id)
        
        // Step 3: Delete feedback first
        const { error: feedbackError } = await supabase
          .from('feedback')
          .delete()
          .in('grade_id', gradeIds)
        
        if (feedbackError) {
          console.error('Error deleting feedback:', feedbackError)
          throw feedbackError
        }
        console.log('Feedback deleted')
        
        // Step 4: Delete grades
        const { error: gradesError } = await supabase
          .from('grades')
          .delete()
          .in('submission_id', submissionIds)
        
        if (gradesError) {
          console.error('Error deleting grades:', gradesError)
          throw gradesError
        }
        console.log('Grades deleted')
      }
      
      // Step 5: Delete submissions
      const { error: submissionsError } = await supabase
        .from('submissions')
        .delete()
        .eq('assignment_id', assignmentId)
      
      if (submissionsError) {
        console.error('Error deleting submissions:', submissionsError)
        throw submissionsError
      }
      console.log('Submissions deleted')
    }
    
    // Step 6: Finally delete the assignment
    const { error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
    
    if (assignmentError) {
      console.error('Error deleting assignment:', assignmentError)
      throw assignmentError
    }
    
    console.log('Assignment deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    throw error
  }
}

// Create a submission with AI-powered analysis
export const createSubmission = async (submissionData, videoBlob = null, assignmentTitle = 'Speech Assignment') => {
  try {
    // Check if submission already exists for this student and assignment
    const { data: existingSubmission, error: checkError } = await supabase
      .from('submissions')
      .select('id')
      .eq('assignment_id', submissionData.assignmentId)
      .eq('student_id', submissionData.studentId)
      .single()

    let submission

    if (existingSubmission) {
      // Update existing submission
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('submissions')
        .update({
          video_url: submissionData.videoUrl,
          transcript: submissionData.transcript,
          status: 'graded',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      submission = updatedSubmission
    } else {
      // Create new submission
      const { data: newSubmission, error: submissionError } = await supabase
        .from('submissions')
        .insert([{
          assignment_id: submissionData.assignmentId,
          student_id: submissionData.studentId,
          video_url: submissionData.videoUrl,
          transcript: submissionData.transcript,
          status: 'graded' // Set to graded since we're auto-grading
        }])
        .select()
        .single()

      if (submissionError) {
        throw submissionError
      }
      submission = newSubmission
    }

    // Process video with AI if video blob is provided
    let aiResult = null
    let finalScore = null // Don't use default score - will be set based on AI processing

    if (videoBlob) {
      console.log('Processing video with AI...')
      try {
        aiResult = await processVideoWithAI(videoBlob, assignmentTitle)

        // Only calculate score if AI processing succeeded
        if (aiResult.analysis.overallScore !== null) {
          finalScore = aiResult.analysis.overallScore
        } else {
          console.warn('AI processing failed - submission recorded without grade')
          // Store submission but don't create grade record
          // This allows reprocessing later
        }

        // Update submission with transcript (even if it's a fallback message)
        if (submission.id && aiResult.transcript) {
          await supabase
            .from('submissions')
            .update({
              transcript: aiResult.transcript
            })
            .eq('id', submission.id)
        }
      } catch (error) {
        // Critical errors (auth, config, rate limit) propagate to user
        console.error('Critical AI processing error:', error)
        throw new Error(`Submission failed: ${error.message}`)
      }
    } else {
      throw new Error('Video blob is required for submission')
    }
    
    // Get detailed filler word data from analysis
    const fillerWordCount = aiResult?.fillerWordAnalysis?.totalCount || 
      Math.floor(Math.random() * 10) + 1 // Fallback random count
    
    const fillerWordsUsed = aiResult?.fillerWordAnalysis?.fillerWordsUsed || []
    const fillersPerMinute = aiResult?.fillerWordAnalysis?.fillersPerMinute || 0
    const categoryBreakdown = aiResult?.fillerWordAnalysis?.categoryBreakdown || {}
    
    // Get individual word counts from detections (if available) or generate fallback
    const fillerWordCounts = {}
    if (aiResult?.fillerWordAnalysis?.detections) {
      // Count each word from actual detections
      aiResult.fillerWordAnalysis.detections.forEach(detection => {
        fillerWordCounts[detection.word] = (fillerWordCounts[detection.word] || 0) + 1
      })
    } else if (fillerWordsUsed.length > 0) {
      // Fallback: distribute count among used words
      fillerWordsUsed.forEach(word => {
        fillerWordCounts[word] = Math.ceil(fillerWordCount / fillerWordsUsed.length)
      })
    }
    
    // Calculate filler word score (0-20 scale, will be displayed as X/20)
    const fillerWordScore = Math.max(0, 20 - fillerWordCount)

    // Get speech content score from AI analysis (0-4 scale)
    const speechContentScore = aiResult?.analysis?.overallScore ?? 2.0 // Use ?? to allow 0

    // Skip grade creation if AI processing failed
    if (finalScore === null) {
      console.warn('Skipping grade creation - AI processing failed')
      return {
        submission,
        grade: null,
        message: 'Submission recorded. Analysis will be completed when AI services are available.'
      }
    }

    // Calculate weighted score: 80% content, 20% filler words
    // Formula: (contentScore/4 * 100 * 0.8) + (fillerScore/20 * 100 * 0.2)
    const contentPercentage = (speechContentScore / 4) * 100
    const fillerPercentage = (fillerWordScore / 20) * 100
    const averageFinalScore = Math.round((contentPercentage * 0.8) + (fillerPercentage * 0.2))

    // Check if grade already exists for this submission
    const { data: existingGrade, error: gradeCheckError } = await supabase
      .from('grades')
      .select('id')
      .eq('submission_id', submission.id)
      .single()

    let grade

    if (existingGrade) {
      // Update existing grade
      const { data: updatedGrade, error: gradeUpdateError } = await supabase
        .from('grades')
        .update({
          total_score: averageFinalScore,
          speech_content_score: speechContentScore,
          filler_word_count: fillerWordCount,
          filler_words_used: fillerWordsUsed,
          filler_words_per_minute: fillersPerMinute,
          filler_category_breakdown: categoryBreakdown,
          filler_word_score: fillerWordScore,
          filler_word_counts: fillerWordCounts,
          filler_word_weight: 0.2,
          speech_content_weight: 0.8,
          content_score_max: 4,
          graded_at: new Date().toISOString()
        })
        .eq('id', existingGrade.id)
        .select()
        .single()

      if (gradeUpdateError) {
        throw gradeUpdateError
      }
      grade = updatedGrade
    } else {
      // Create new grade
      const { data: newGrade, error: gradeError } = await supabase
        .from('grades')
        .insert([{
          submission_id: submission.id,
          total_score: averageFinalScore,
          speech_content_score: speechContentScore,
          filler_word_count: fillerWordCount,
          filler_words_used: fillerWordsUsed,
          filler_words_per_minute: fillersPerMinute,
          filler_category_breakdown: categoryBreakdown,
          filler_word_score: fillerWordScore,
          filler_word_counts: fillerWordCounts,
          filler_word_weight: 0.2,
          speech_content_weight: 0.8,
          content_score_max: 3
        }])
        .select()
        .single()

      if (gradeError) {
        throw gradeError
      }
      grade = newGrade
    }

    // Generate feedback using AI analysis (Bedrock Agent)
    let feedbackTexts
    
    // Generate filler word feedback text
    const generateFillerFeedback = () => {
      if (fillerWordCount === 0) {
        return "Excellent! No filler words detected. Your speech was clear and confident."
      }
      
      let feedback = `Detected ${fillerWordCount} filler word${fillerWordCount > 1 ? 's' : ''} in your speech.`
      
      if (fillerWordsUsed && fillerWordsUsed.length > 0) {
        const wordsWithCounts = fillerWordsUsed.map(word => {
          const count = fillerWordCounts[word] || 1
          return `"${word}" (${count}x)`
        }).join(', ')
        feedback += ` Words used: ${wordsWithCounts}.`
      }
      
      feedback += ` Score: ${fillerWordScore}/20.`
      
      if (fillerWordCount <= 2) {
        feedback += " Good job! Just a few minor fillers to work on."
      } else if (fillerWordCount <= 5) {
        feedback += " Try to reduce filler words for clearer communication."
      } else {
        feedback += " Focus on pausing instead of using filler words to improve your delivery."
      }
      
      return feedback
    }

    if (aiResult && aiResult.analysis) {
      // If we have an AI result, even a partial or placeholder one, use its content.
      feedbackTexts = {
        filler_words: aiResult.analysis.fillerWords || generateFillerFeedback(),
        speech_content: aiResult.analysis.speechContent || "Speech content analysis temporarily unavailable.",
        body_language: aiResult.analysis.bodyLanguage || "Delivery analysis will be available when AI processing is restored."
      }
    } else {
      // Simple fallback when AI processing fails entirely
      feedbackTexts = {
        filler_words: generateFillerFeedback(),
        speech_content: "Speech content analysis temporarily unavailable. Please try submitting again.",
        body_language: "Delivery analysis will be available when AI processing is restored."
      }
    }
    
    // Check if feedback already exists for this grade
    const { data: existingFeedback, error: feedbackCheckError } = await supabase
      .from('feedback')
      .select('id')
      .eq('grade_id', grade.id)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      await supabase
        .from('feedback')
        .update({
          filler_words_feedback: feedbackTexts.filler_words,
          speech_content_feedback: feedbackTexts.speech_content,
          body_language_feedback: feedbackTexts.body_language,
          created_at: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)
    } else {
      // Create new feedback
      await supabase
        .from('feedback')
        .insert([{
          grade_id: grade.id,
          filler_words_feedback: feedbackTexts.filler_words,
          speech_content_feedback: feedbackTexts.speech_content,
          body_language_feedback: feedbackTexts.body_language
        }])
    }

    return { submission, grade }
  } catch (error) {
    console.error('Error creating submission:', error)
    throw error
  }
}

/**
 * ASYNC SUBMISSION: Initiates submission and adds to processing queue
 * Creates submission record with 'pending' status and queues for background AI processing
 * Returns submission ID without waiting for AI analysis to complete
 *
 * The queue system prevents API rate limiting by controlling concurrent AI calls
 */
export const initiateSubmission = async (submissionData, videoBlob, assignmentTitle = 'Speech Assignment') => {
  try {
    console.log('[Queue Submission] Initiating submission with queue system...')

    // Check if submission already exists for this student and assignment
    const { data: existingSubmission, error: checkError } = await supabase
      .from('submissions')
      .select('id')
      .eq('assignment_id', submissionData.assignmentId)
      .eq('student_id', submissionData.studentId)
      .single()

    let submission

    if (existingSubmission) {
      // Update existing submission
      console.log(`[Queue Submission] Updating existing submission ${existingSubmission.id}`)
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('submissions')
        .update({
          video_url: submissionData.videoUrl,
          transcript: null,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          processing_started_at: null,
          processing_completed_at: null,
          error_message: null
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (updateError) throw updateError
      submission = updatedSubmission

      // Remove any existing queue entries for this submission
      await supabase
        .from('submission_queue')
        .delete()
        .eq('submission_id', existingSubmission.id)
    } else {
      // Create new submission
      console.log('[Queue Submission] Creating new submission')
      const { data: newSubmission, error: insertError } = await supabase
        .from('submissions')
        .insert([{
          assignment_id: submissionData.assignmentId,
          student_id: submissionData.studentId,
          video_url: submissionData.videoUrl,
          transcript: null,
          status: 'pending',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (insertError) throw insertError
      submission = newSubmission
    }

    console.log(`[Queue Submission] Submission created with ID: ${submission.id}`)

    // Add to queue for controlled background processing
    const { error: queueError } = await supabase
      .from('submission_queue')
      .insert([{
        submission_id: submission.id,
        assignment_title: assignmentTitle,
        video_url: submissionData.videoUrl,
        priority: 0, // Can be increased for priority assignments
        status: 'pending'
      }])

    if (queueError) {
      console.error('[Queue Submission] Failed to add to queue:', queueError)
      // Don't throw - submission is saved, just queue insert failed
      // Fall back to direct processing
      console.log('[Queue Submission] Falling back to direct processing...')
      runBackgroundAI(submission.id, videoBlob, assignmentTitle)
        .catch(err => {
          console.error('[Queue Submission] Fallback processing failed:', err)
          supabase.from('submissions').update({
            status: 'failed',
            error_message: err.message
          }).eq('id', submission.id)
        })
    } else {
      console.log(`[Queue Submission] Added to queue for submission ${submission.id}`)
    }

    // Return submission ID immediately
    return {
      submissionId: submission.id,
      status: 'pending',
      queued: !queueError
    }
  } catch (error) {
    console.error('[Queue Submission] Error initiating submission:', error)
    throw error
  }
}

/**
 * BACKGROUND AI PROCESSING: Runs asynchronously without blocking frontend
 * This function executes AI analysis and updates submission status when complete
 */
const runBackgroundAI = async (submissionId, videoBlob, assignmentTitle) => {
  try {
    console.log(`[Background AI] Starting processing for submission ${submissionId}`)

    // Update status to 'processing'
    await supabase.from('submissions').update({
      status: 'processing',
      processing_started_at: new Date().toISOString()
    }).eq('id', submissionId)

    // Run AI processing (reuse existing processVideoWithAI function)
    const aiResult = await processVideoWithAI(videoBlob, assignmentTitle)

    // Update submission with transcript
    await supabase.from('submissions').update({
      transcript: aiResult.transcript
    }).eq('id', submissionId)

    // Only create grade if AI processing succeeded
    if (aiResult.analysis.overallScore === null) {
      console.warn(`[Background AI] AI processing failed for submission ${submissionId} - no grade created`)
      await supabase.from('submissions').update({
        status: 'failed',
        error_message: 'AI analysis failed - please resubmit',
        processing_completed_at: new Date().toISOString()
      }).eq('id', submissionId)
      return
    }

    // Extract AI analysis data
    const fillerWordCount = aiResult?.fillerWordAnalysis?.totalCount || 0
    const fillerWordsUsed = aiResult?.fillerWordAnalysis?.fillerWordsUsed || []
    const fillersPerMinute = aiResult?.fillerWordAnalysis?.fillersPerMinute || 0
    const categoryBreakdown = aiResult?.fillerWordAnalysis?.categoryBreakdown || {}

    // Get individual word counts from detections
    const fillerWordCounts = {}
    if (aiResult?.fillerWordAnalysis?.detections) {
      aiResult.fillerWordAnalysis.detections.forEach(detection => {
        fillerWordCounts[detection.word] = (fillerWordCounts[detection.word] || 0) + 1
      })
    } else if (fillerWordsUsed.length > 0) {
      fillerWordsUsed.forEach(word => {
        fillerWordCounts[word] = Math.ceil(fillerWordCount / fillerWordsUsed.length)
      })
    }

    // Calculate scores with weighted formula: 80% content, 20% filler words
    const fillerWordScore = Math.max(0, 20 - fillerWordCount)
    const speechContentScore = aiResult?.analysis?.overallScore ?? 2.0 // Use ?? to allow 0
    const contentPercentage = (speechContentScore / 4) * 100
    const fillerPercentage = (fillerWordScore / 20) * 100
    const averageFinalScore = Math.round((contentPercentage * 0.8) + (fillerPercentage * 0.2))

    // Detailed logging for debugging
    console.log('=== GRADE CALCULATION DEBUG ===')
    console.log('Speech Content Score:', speechContentScore, '/ 4')
    console.log('Filler Word Score:', fillerWordScore, '/ 20')
    console.log('Content Percentage:', contentPercentage, '% (weight: 80%)')
    console.log('Filler Percentage:', fillerPercentage, '% (weight: 20%)')
    console.log('Calculation:', `(${contentPercentage} * 0.8) + (${fillerPercentage} * 0.2) = ${(contentPercentage * 0.8) + (fillerPercentage * 0.2)}`)
    console.log('Final Score (rounded):', averageFinalScore, '/ 100')
    console.log('===============================')

    // Check if grade already exists for this submission (prevent duplicates)
    const { data: existingGrade, error: existingGradeError } = await supabase
      .from('grades')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    let grade
    if (existingGrade) {
      // Update existing grade
      console.log(`[Background AI] Updating existing grade for submission ${submissionId}`)
      const { data: updatedGrade, error: gradeUpdateError } = await supabase
        .from('grades')
        .update({
          total_score: averageFinalScore,
          speech_content_score: speechContentScore,
          filler_word_count: fillerWordCount,
          filler_words_used: fillerWordsUsed,
          filler_words_per_minute: fillersPerMinute,
          filler_category_breakdown: categoryBreakdown,
          filler_word_score: fillerWordScore,
          filler_word_counts: fillerWordCounts,
          filler_word_weight: 0.2,
          speech_content_weight: 0.8,
          content_score_max: 4,
          graded_at: new Date().toISOString()
        })
        .eq('id', existingGrade.id)
        .select()
        .single()

      if (gradeUpdateError) throw gradeUpdateError
      grade = updatedGrade
    } else {
      // Create new grade record
      console.log(`[Background AI] Creating new grade for submission ${submissionId}`)
      const { data: newGrade, error: gradeError } = await supabase.from('grades').insert([{
        submission_id: submissionId,
        total_score: averageFinalScore,
        speech_content_score: speechContentScore,
        filler_word_count: fillerWordCount,
        filler_words_used: fillerWordsUsed,
        filler_words_per_minute: fillersPerMinute,
        filler_category_breakdown: categoryBreakdown,
        filler_word_score: fillerWordScore,
        filler_word_counts: fillerWordCounts,
        filler_word_weight: 0.2,
        speech_content_weight: 0.8,
        content_score_max: 3
      }]).select().single()

      if (gradeError) throw gradeError
      grade = newGrade
    }

    // Generate feedback
    const generateFillerFeedback = () => {
      if (fillerWordCount === 0) {
        return "Excellent! No filler words detected. Your speech was clear and confident."
      }

      let feedback = `Detected ${fillerWordCount} filler word${fillerWordCount > 1 ? 's' : ''} in your speech.`

      if (fillerWordsUsed && fillerWordsUsed.length > 0) {
        const wordsWithCounts = fillerWordsUsed.map(word => {
          const count = fillerWordCounts[word] || 1
          return `"${word}" (${count}x)`
        }).join(', ')
        feedback += ` Words used: ${wordsWithCounts}.`
      }

      feedback += ` Score: ${fillerWordScore}/20.`

      if (fillerWordCount <= 2) {
        feedback += " Good job! Just a few minor fillers to work on."
      } else if (fillerWordCount <= 5) {
        feedback += " Try to reduce filler words for clearer communication."
      } else {
        feedback += " Focus on pausing instead of using filler words to improve your delivery."
      }

      return feedback
    }

    const feedbackTexts = {
      filler_words: aiResult.analysis.fillerWords || generateFillerFeedback(),
      speech_content: aiResult.analysis.speechContent || "Speech content analysis completed.",
      body_language: aiResult.analysis.bodyLanguage || "Delivery analysis completed."
    }

    // Check if feedback already exists for this grade (prevent duplicates)
    const { data: existingFeedback, error: existingFeedbackError } = await supabase
      .from('feedback')
      .select('id')
      .eq('grade_id', grade.id)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      console.log(`[Background AI] Updating existing feedback for grade ${grade.id}`)
      await supabase.from('feedback').update({
        filler_words_feedback: feedbackTexts.filler_words,
        speech_content_feedback: feedbackTexts.speech_content,
        body_language_feedback: feedbackTexts.body_language,
        created_at: new Date().toISOString()
      }).eq('id', existingFeedback.id)
    } else {
      // Create new feedback record
      console.log(`[Background AI] Creating new feedback for grade ${grade.id}`)
      await supabase.from('feedback').insert([{
        grade_id: grade.id,
        filler_words_feedback: feedbackTexts.filler_words,
        speech_content_feedback: feedbackTexts.speech_content,
        body_language_feedback: feedbackTexts.body_language
      }])
    }

    // Update submission to 'completed'
    await supabase.from('submissions').update({
      status: 'completed',
      processing_completed_at: new Date().toISOString()
    }).eq('id', submissionId)

    console.log(`[Background AI] Successfully completed processing for submission ${submissionId}`)
  } catch (error) {
    console.error(`[Background AI] Fatal error for submission ${submissionId}:`, error)

    // Update submission to failed state
    await supabase.from('submissions').update({
      status: 'failed',
      error_message: error.message,
      processing_completed_at: new Date().toISOString()
    }).eq('id', submissionId)
  }
}

/**
 * UTILITY: Check submission status for polling
 * Returns current status and processing metadata for a submission
 */
export const checkSubmissionStatus = async (submissionId) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, status, processing_started_at, processing_completed_at, error_message')
    .eq('id', submissionId)
    .single()

  if (error) throw error
  return data
}

/**
 * QUEUE MANAGEMENT: Trigger the queue processor Edge Function
 * Call this periodically (e.g., every 5 seconds) to process pending submissions
 * The queue processor handles concurrency control (max 5 concurrent)
 */
export const triggerQueueProcessor = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('queue-processor', {
      method: 'POST'
    })

    if (error) {
      console.error('[Queue] Failed to trigger processor:', error)
      return { success: false, error: error.message }
    }

    console.log('[Queue] Processor triggered:', data)
    return { success: true, ...data }
  } catch (error) {
    console.error('[Queue] Error triggering processor:', error)
    return { success: false, error: error.message }
  }
}

/**
 * QUEUE MANAGEMENT: Get queue statistics
 * Returns counts of pending, processing, completed, and failed items
 */
export const getQueueStats = async () => {
  try {
    const { data, error } = await supabase
      .from('submission_queue')
      .select('status')

    if (error) throw error

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: data.length
    }

    data.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++
      }
    })

    return stats
  } catch (error) {
    console.error('[Queue] Error fetching stats:', error)
    return null
  }
}

/**
 * QUEUE MANAGEMENT: Get queue items for a specific submission
 * Useful for checking if a submission is queued and its position
 */
export const getQueueItemForSubmission = async (submissionId) => {
  try {
    const { data, error } = await supabase
      .from('submission_queue')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    return data
  } catch (error) {
    console.error('[Queue] Error fetching queue item:', error)
    return null
  }
}

/**
 * QUEUE MANAGEMENT: Retry a failed submission
 * Resets the queue item to pending status for reprocessing
 */
export const retryFailedSubmission = async (submissionId) => {
  try {
    // Reset submission status
    await supabase
      .from('submissions')
      .update({
        status: 'pending',
        error_message: null,
        processing_started_at: null,
        processing_completed_at: null
      })
      .eq('id', submissionId)

    // Reset or create queue entry
    const { data: existingQueue } = await supabase
      .from('submission_queue')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    if (existingQueue) {
      await supabase
        .from('submission_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
          processing_started_at: null,
          completed_at: null
        })
        .eq('id', existingQueue.id)
    } else {
      // Get submission details for queue entry
      const { data: submission } = await supabase
        .from('submissions')
        .select('video_url, assignments(title)')
        .eq('id', submissionId)
        .single()

      await supabase
        .from('submission_queue')
        .insert([{
          submission_id: submissionId,
          video_url: submission?.video_url,
          assignment_title: submission?.assignments?.title,
          status: 'pending',
          priority: 1 // Higher priority for retries
        }])
    }

    console.log(`[Queue] Submission ${submissionId} queued for retry`)
    return { success: true }
  } catch (error) {
    console.error('[Queue] Error retrying submission:', error)
    return { success: false, error: error.message }
  }
}

// Get assignments for student dashboard
export const getAssignmentsForStudent = async (studentId) => {
  try {
    // Get all classes the student is enrolled in
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .select(`
        classes(
          id,
          name,
          assignments(
            id,
            title,
            description,
            due_date,
            max_duration_seconds
          )
        )
      `)
      .eq('student_id', studentId)

    if (enrollmentError) {
      throw enrollmentError
    }

    // Flatten assignments from all classes
    const allAssignments = []
    for (const enrollment of enrollments) {
      for (const assignment of enrollment.classes.assignments) {
        // Get submission status for this student
        const { data: submission } = await supabase
          .from('submissions')
          .select('status')
          .eq('assignment_id', assignment.id)
          .eq('student_id', studentId)
          .single()

        allAssignments.push({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          className: enrollment.classes.name,
          dueDate: new Date(assignment.due_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          rawDueDate: assignment.due_date,
          status: submission ? 
            (submission.status === 'graded' ? 'In Progress' : 'In Progress') : 
            'Not Started',
          maxDuration: assignment.max_duration_seconds
        })
      }
    }

    // Sort all assignments by due date (soonest first)
    return allAssignments.sort((a, b) => new Date(a.rawDueDate) - new Date(b.rawDueDate))
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return []
  }
}

// Get assignments for a specific class for a student
export const getAssignmentsForStudentInClass = async (studentId, classId) => {
  try {
    // Query 1: Fetch all assignments for the class
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        due_date,
        max_duration_seconds,
        classes!inner(
          id,
          name
        )
      `)
      .eq('class_id', classId)
      .order('due_date', { ascending: true })

    if (assignmentsError) {
      throw assignmentsError
    }

    // Query 2: Fetch ALL submissions for this student in bulk (single query)
    const { data: submissions } = await supabase
      .from('submissions')
      .select('assignment_id, status')
      .eq('student_id', studentId)
      .in('assignment_id', assignments.map(a => a.id))

    // Create lookup map for O(1) access
    const submissionMap = new Map(
      submissions?.map(sub => [sub.assignment_id, sub.status]) || []
    )

    // Map assignments with their submission status
    return assignments.map(assignment => {
      const submissionStatus = submissionMap.get(assignment.id)

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        className: assignment.classes.name,
        dueDate: assignment.due_date
          ? new Date(assignment.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : null,
        rawDueDate: assignment.due_date,
        status: submissionStatus
          ? (submissionStatus === 'completed' ? 'completed' : 'in_progress')
          : 'not_started',
        maxDuration: assignment.max_duration_seconds
          ? Math.floor(assignment.max_duration_seconds / 60)
          : null
      }
    })
  } catch (error) {
    console.error('Error fetching student assignments for class:', error)
    return []
  }
}

// STUDENT LOOKUP FUNCTIONS

// Get all students with their primary teacher info
export const getAllStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        email,
        created_at,
        primary_class:classes!primary_class_id(
          id,
          name,
          teacher:teachers(name, email)
        )
      `)
      .order('name')

    if (error) {
      throw error
    }

    return data.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      primaryClass: student.primary_class?.name,
      primaryTeacher: student.primary_class?.teacher?.name,
      primaryTeacherEmail: student.primary_class?.teacher?.email
    }))
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

// Get student by ID with full details
export const getStudentProfile = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        email,
        created_at,
        primary_class:classes!primary_class_id(
          id,
          name,
          teacher:teachers(name, email)
        ),
        enrollments:class_enrollments(
          classes(id, name)
        )
      `)
      .eq('id', studentId)
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      primaryClass: data.primary_class?.name,
      primaryTeacher: data.primary_class?.teacher?.name,
      primaryTeacherEmail: data.primary_class?.teacher?.email,
      enrolledClasses: data.enrollments?.map(e => e.classes.name) || []
    }
  } catch (error) {
    console.error('Error fetching student profile:', error)
    return null
  }
}

// Get students by teacher (all students whose primary class belongs to this teacher)
export const getStudentsByTeacher = async (teacherEmail) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        email,
        primary_class:classes!primary_class_id(
          name,
          teacher:teachers!inner(email)
        )
      `)
      .eq('primary_class.teacher.email', teacherEmail)
      .order('name')

    if (error) {
      throw error
    }

    return data.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      primaryClass: student.primary_class?.name
    }))
  } catch (error) {
    console.error('Error fetching students by teacher:', error)
    return []
  }
}

// GRADING FUNCTIONS
// Note: calculateStudentTotalGrade has been removed and integrated into getStudentsByClass for better performance

// CLASS CREATION AND ENROLLMENT FUNCTIONS

// Create a new class (for teachers)
export const createClass = async (classData, teacherEmail) => {
  try {
    // First get the teacher ID from email
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', teacherEmail)
      .single()
    
    if (teacherError || !teacher) {
      throw new Error('Teacher not found')
    }

    // Create the class (the database will auto-generate the class_code)
    const { data: newClass, error: classError } = await supabase
      .from('classes')
      .insert([{
        name: classData.name,
        description: classData.description || '',
        teacher_id: teacher.id
      }])
      .select('id, name, description, class_code, teacher_id, created_at')
      .single()
    
    if (classError) {
      throw classError
    }

    return newClass
  } catch (error) {
    console.error('Error creating class:', error)
    throw error
  }
}

// Delete a class and all related data
export const deleteClass = async (classId) => {
  try {
    console.log('Deleting class:', classId)

    // Step 1: Get all assignments for this class
    const { data: assignments, error: assignmentsSelectError } = await supabase
      .from('assignments')
      .select('id')
      .eq('class_id', classId)

    if (assignmentsSelectError) {
      console.error('Error fetching assignments:', assignmentsSelectError)
      throw assignmentsSelectError
    }

    console.log('Found assignments:', assignments?.length || 0)

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map(a => a.id)

      // Step 2: Get all submissions for these assignments
      const { data: submissions, error: submissionsSelectError } = await supabase
        .from('submissions')
        .select('id')
        .in('assignment_id', assignmentIds)

      if (submissionsSelectError) {
        console.error('Error fetching submissions:', submissionsSelectError)
        throw submissionsSelectError
      }

      console.log('Found submissions:', submissions?.length || 0)

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id)

        // Step 3: Get all grades for these submissions
        const { data: grades, error: gradesSelectError } = await supabase
          .from('grades')
          .select('id')
          .in('submission_id', submissionIds)

        if (gradesSelectError) {
          console.error('Error fetching grades:', gradesSelectError)
          throw gradesSelectError
        }

        console.log('Found grades:', grades?.length || 0)

        if (grades && grades.length > 0) {
          const gradeIds = grades.map(g => g.id)

          // Step 4: Delete feedback first
          const { error: feedbackError } = await supabase
            .from('feedback')
            .delete()
            .in('grade_id', gradeIds)

          if (feedbackError) {
            console.error('Error deleting feedback:', feedbackError)
            throw feedbackError
          }
          console.log('Feedback deleted')

          // Step 5: Delete grades
          const { error: gradesError } = await supabase
            .from('grades')
            .delete()
            .in('submission_id', submissionIds)

          if (gradesError) {
            console.error('Error deleting grades:', gradesError)
            throw gradesError
          }
          console.log('Grades deleted')
        }

        // Step 6: Delete submissions
        const { error: submissionsError } = await supabase
          .from('submissions')
          .delete()
          .in('assignment_id', assignmentIds)

        if (submissionsError) {
          console.error('Error deleting submissions:', submissionsError)
          throw submissionsError
        }
        console.log('Submissions deleted')
      }

      // Step 7: Delete assignments
      const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .eq('class_id', classId)

      if (assignmentsError) {
        console.error('Error deleting assignments:', assignmentsError)
        throw assignmentsError
      }
      console.log('Assignments deleted')
    }

    // Step 8: Delete class enrollments
    const { error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('class_id', classId)

    if (enrollmentsError) {
      console.error('Error deleting class enrollments:', enrollmentsError)
      throw enrollmentsError
    }
    console.log('Class enrollments deleted')

    // Step 8.5: Clear primary_class_id for students whose primary class is being deleted
    const { error: studentUpdateError } = await supabase
      .from('students')
      .update({ primary_class_id: null })
      .eq('primary_class_id', classId)

    if (studentUpdateError) {
      console.error('Error clearing student primary_class_id:', studentUpdateError)
      throw studentUpdateError
    }
    console.log('Student primary_class_id references cleared')

    // Step 9: Finally delete the class
    const { error: classError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (classError) {
      console.error('Error deleting class:', classError)
      throw classError
    }

    console.log('Class deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting class:', error)
    throw error
  }
}

// Join a class using class code (for students)
export const joinClassByCode = async (classCode, studentEmail) => {
  try {
    // Get student ID from email
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name')
      .eq('email', studentEmail)
      .single()
    
    if (studentError || !student) {
      throw new Error('Student not found')
    }

    // Find class by code
    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('class_code', classCode.toUpperCase())
      .single()
    
    if (classError || !classInfo) {
      throw new Error('Class not found with that code')
    }

    // Check if student is already enrolled
    const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('class_id', classInfo.id)
      .single()
    
    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class')
    }

    // Enroll student in class
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .insert([{
        student_id: student.id,
        class_id: classInfo.id
      }])
      .select()
      .single()
    
    if (enrollmentError) {
      throw enrollmentError
    }

    return {
      success: true,
      className: classInfo.name,
      enrollment: enrollment
    }
  } catch (error) {
    console.error('Error joining class:', error)
    throw error
  }
}

// Get classes with their codes (for teachers)
export const getClassesWithCodes = async (teacherEmail) => {
  try {
    // Get teacher ID
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', teacherEmail)
      .single()
    
    if (teacherError || !teacher) {
      throw new Error('Teacher not found')
    }

    // Get classes with codes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        description,
        class_code,
        created_at,
        class_enrollments(count)
      `)
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })
    
    if (classesError) {
      throw classesError
    }

    return classes.map(classItem => ({
      id: classItem.id,
      name: classItem.name,
      description: classItem.description,
      classCode: classItem.class_code,
      createdAt: classItem.created_at,
      studentCount: classItem.class_enrollments?.[0]?.count || 0
    }))
  } catch (error) {
    console.error('Error fetching classes with codes:', error)
    throw error
  }
}

// Get enrolled classes for students (updated to include class codes for reference)
export const getEnrolledClasses = async (studentEmail) => {
  try {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('email', studentEmail)
      .single()
    
    if (studentError || !student) {
      throw new Error('Student not found')
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .select(`
        enrolled_at,
        classes(
          id,
          name,
          description,
          class_code,
          teachers(name, email)
        )
      `)
      .eq('student_id', student.id)
      .order('enrolled_at', { ascending: false })
    
    if (enrollmentsError) {
      throw enrollmentsError
    }

    return enrollments.map(enrollment => ({
      id: enrollment.classes.id,
      name: enrollment.classes.name,
      description: enrollment.classes.description,
      classCode: enrollment.classes.class_code,
      teacherName: enrollment.classes.teachers?.name,
      teacherEmail: enrollment.classes.teachers?.email,
      enrolledAt: enrollment.enrolled_at
    }))
  } catch (error) {
    console.error('Error fetching enrolled classes:', error)
    throw error
  }
}

// Get all grades for a student with detailed info
export const getDetailedStudentGrades = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        total_score,
        graded_at,
        submissions!inner(
          student_id,
          assignment_id,
          assignments(title, description)
        )
      `)
      .eq('submissions.student_id', studentId)
      .order('graded_at', { ascending: false })

    if (error) {
      throw error
    }

    return data.map(grade => ({
      assignmentTitle: grade.submissions.assignments.title,
      assignmentDescription: grade.submissions.assignments.description,
      score: grade.total_score,
      letterGrade: getLetterGrade(grade.total_score),
      gradedAt: grade.graded_at
    }))
  } catch (error) {
    console.error('Error fetching detailed student grades:', error)
    return []
  }
}