import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import LoginPage from './components/LoginPage'
import Header from './components/Header'
import TeacherDashboard from './components/TeacherDashboard'
import StudentDashboard from './components/StudentDashboard'
import StudentClassesPage from './components/StudentClassesPage'
import ClassPage from './components/ClassPage'
import AssignmentDetailPage from './components/AssignmentDetailPage'
import StudentDetailPage from './components/StudentDetailPage'
import StudentAssignmentPage from './components/StudentAssignmentPage'
import RecordingPage from './components/RecordingPage'

function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'teacher' or 'student'
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedStudentAssignment, setSelectedStudentAssignment] = useState(null)
  const [currentStudentId, setCurrentStudentId] = useState(null)
  const [selectedStudentClass, setSelectedStudentClass] = useState(null)

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await handleLogin(session.user)
      }
      setIsLoading(false)
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setCurrentStudentId(null)
        setCurrentView('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle user login and determine role
  const handleLogin = async (user, role = null) => {
    setUser(user)

    // If role is provided (from signup), use it directly
    if (role) {
      setUserRole(role)
      if (role === 'student') {
        // Fetch the student ID for the newly created profile
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('email', user.email)
          .single()
        if (studentData) {
          setCurrentStudentId(studentData.id)
        }
      }
      setCurrentView('dashboard')
      return
    }

    // Try to find user in students table first
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('email', user.email)
      .single()

    if (studentData) {
      setUserRole('student')
      setCurrentStudentId(studentData.id)
      setCurrentView('dashboard')
    } else {
      // Check if user is a teacher
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', user.email)
        .single()

      if (teacherData) {
        setUserRole('teacher')
        setCurrentView('dashboard')
      } else {
        // Default to student role if not found (for new signups)
        setUserRole('student')
        setCurrentView('dashboard')
      }
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Navigation handlers
  const handleBackToDashboard = () => {
    setSelectedClass(null)
    setSelectedAssignment(null)
    setSelectedStudent(null)
    setSelectedStudentClass(null)
    setCurrentView('dashboard')
  }

  const handleEnterClass = (className) => {
    setSelectedClass(className)
    setCurrentView('class')
  }

  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment)
    setCurrentView('assignment')
  }

  const handleBackToClass = () => {
    setSelectedAssignment(null)
    setSelectedStudent(null)
    setCurrentView('class')
  }

  const handleViewStudent = (student) => {
    setSelectedStudent(student)
    setCurrentView('studentDetail')
  }

  const handleBackFromStudent = () => {
    setSelectedStudent(null)
    // Determine where to go back to
    if (selectedAssignment) {
      setCurrentView('assignment')
    } else {
      setCurrentView('class')
    }
  }

  const handleViewStudentAssignment = (assignment) => {
    setSelectedStudentAssignment(assignment)
    setCurrentView('studentAssignment')
  }

  const handleBackFromStudentAssignment = () => {
    setSelectedStudentAssignment(null)
    if (selectedStudentClass) {
      setCurrentView('studentAssignments')
    } else {
      setCurrentView('dashboard')
    }
  }

  const handleViewRecording = (assignment) => {
    setSelectedStudentAssignment(assignment)
    setCurrentView('recording')
  }

  const handleStudentSelectClass = (classItem) => {
    setSelectedStudentClass(classItem)
    setCurrentView('studentAssignments')
  }

  const handleBackToStudentClasses = () => {
    setSelectedStudentClass(null)
    setCurrentView('dashboard')
  }

  const handleBackFromRecording = () => {
    setCurrentView('studentAssignment')
  }

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <>
      <Header user={user} userRole={userRole} onLogout={handleLogout} />
      {currentView === 'dashboard' && userRole === 'teacher' && (
        <TeacherDashboard 
          user={user}
          onClassSelect={(classItem) => handleEnterClass(classItem.name)}
        />
      )}
      {currentView === 'dashboard' && userRole === 'student' && currentStudentId && (
        <StudentClassesPage 
          user={{ id: currentStudentId, email: user.email }}
          onClassSelect={handleStudentSelectClass}
        />
      )}
      {currentView === 'studentAssignments' && selectedStudentClass && (
        <StudentDashboard 
          user={{ id: currentStudentId, email: user.email }}
          selectedClass={selectedStudentClass}
          onAssignmentSelect={handleViewStudentAssignment}
          onBackToClasses={handleBackToStudentClasses}
        />
      )}
      {currentView === 'class' && (
        <ClassPage 
          className={selectedClass}
          onBack={handleBackToDashboard}
          onViewAssignment={handleViewAssignment}
          onViewStudent={handleViewStudent}
        />
      )}
      {currentView === 'assignment' && (
        <AssignmentDetailPage 
          assignment={selectedAssignment}
          onBack={handleBackToClass}
          onViewStudent={handleViewStudent}
        />
      )}
      {currentView === 'studentDetail' && (
        <StudentDetailPage 
          student={selectedStudent}
          onBack={handleBackFromStudent}
        />
      )}
      {currentView === 'studentAssignment' && (
        <StudentAssignmentPage 
          assignment={selectedStudentAssignment}
          studentId={currentStudentId}
          onBack={handleBackFromStudentAssignment}
          onViewRecording={handleViewRecording}
        />
      )}
      {currentView === 'recording' && (
        <RecordingPage 
          assignment={selectedStudentAssignment}
          studentId={currentStudentId}
          onBack={handleBackFromRecording}
        />
      )}
    </>
  )
}

export default App