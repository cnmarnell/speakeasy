import { supabase } from '../lib/supabase'

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
    .order('created_at', { ascending: false })
  
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
    })
  }))
}

// Fetch students enrolled in a specific class
export const getStudentsByClass = async (className) => {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      class_enrollments!inner(
        classes!inner(name)
      )
    `)
    .eq('class_enrollments.classes.name', className)
    .order('name')
  
  if (error) {
    console.error('Error fetching students:', error)
    return []
  }
  
  // Calculate grades for each student
  const studentsWithGrades = await Promise.all(
    data.map(async (student) => {
      const totalGradeInfo = await calculateStudentTotalGrade(student.id)
      
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        overallGrade: totalGradeInfo.letterGrade,
        totalPoints: `${totalGradeInfo.totalGrade}/100`,
        submissionCount: totalGradeInfo.submissionCount,
        lastActivity: ""
      }
    })
  )
  
  return studentsWithGrades
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
        submissions!inner(assignment_id, student_id)
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
      bodyLanguage: "No feedback available yet."
    }
  }
  
  const feedback = data[0]
  return {
    fillerWords: feedback.filler_words_feedback || "No feedback available yet.",
    speechContent: feedback.speech_content_feedback || "No feedback available yet.",
    bodyLanguage: feedback.body_language_feedback || "No feedback available yet."
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
    })
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
    case 'graded': return "In Progress" // Show as in progress so they can view feedback
    case 'processing': return "In Progress"
    default: return "Not Started"
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

// Create a submission with automatic grading
export const createSubmission = async (submissionData) => {
  try {
    // Create the submission
    const { data: submission, error: submissionError } = await supabase
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

    // Generate a random grade between 70-100 (realistic range)
    const randomGrade = Math.floor(Math.random() * 31) + 70 // 70-100
    const fillerWordCount = Math.floor(Math.random() * 10) + 1 // 1-10 filler words

    // Create the grade
    const { data: grade, error: gradeError } = await supabase
      .from('grades')
      .insert([{
        submission_id: submission.id,
        total_score: randomGrade,
        filler_word_count: fillerWordCount
      }])
      .select()
      .single()

    if (gradeError) {
      throw gradeError
    }

    // Create feedback
    const feedbackTexts = {
      high: {
        filler_words: "Excellent control of filler words. Very natural and confident delivery.",
        speech_content: "Outstanding content with clear structure and compelling arguments.",
        body_language: "Confident posture, excellent eye contact, and effective use of gestures."
      },
      medium: {
        filler_words: "Good control of filler words with room for minor improvement.",
        speech_content: "Well-organized content with solid supporting evidence.",
        body_language: "Good posture and eye contact. Consider using more hand gestures."
      },
      low: {
        filler_words: "Work on reducing filler words like 'um' and 'uh' for smoother delivery.",
        speech_content: "Content is adequate but could benefit from better organization.",
        body_language: "Focus on maintaining eye contact and confident posture throughout."
      }
    }

    const feedbackLevel = randomGrade >= 90 ? 'high' : randomGrade >= 80 ? 'medium' : 'low'
    
    await supabase
      .from('feedback')
      .insert([{
        grade_id: grade.id,
        filler_words_feedback: feedbackTexts[feedbackLevel].filler_words,
        speech_content_feedback: feedbackTexts[feedbackLevel].speech_content,
        body_language_feedback: feedbackTexts[feedbackLevel].body_language
      }])

    return { submission, grade }
  } catch (error) {
    console.error('Error creating submission:', error)
    throw error
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
          status: submission ? 
            (submission.status === 'graded' ? 'In Progress' : 'In Progress') : 
            'Not Started',
          maxDuration: assignment.max_duration_seconds
        })
      }
    }

    return allAssignments
  } catch (error) {
    console.error('Error fetching student assignments:', error)
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

// Calculate total grade for a student (average of all their submission grades)
export const calculateStudentTotalGrade = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        total_score,
        submissions!inner(student_id)
      `)
      .eq('submissions.student_id', studentId)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return {
        totalGrade: 0,
        letterGrade: 'N/A',
        submissionCount: 0
      }
    }

    const totalPoints = data.reduce((sum, grade) => sum + (grade.total_score || 0), 0)
    const average = Math.round(totalPoints / data.length)

    return {
      totalGrade: average,
      letterGrade: getLetterGrade(average),
      submissionCount: data.length
    }
  } catch (error) {
    console.error('Error calculating student total grade:', error)
    return {
      totalGrade: 0,
      letterGrade: 'N/A',
      submissionCount: 0
    }
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