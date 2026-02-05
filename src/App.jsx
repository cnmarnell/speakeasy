import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'
import './App.css'
import { useApp } from './contexts/AppContext'
import { TutorialProvider } from './contexts/TutorialContext'
import { getAssignmentById, getStudentById, getClassById } from './data/supabaseData'
import LoginPage from './components/LoginPage'
import Header from './components/Header'
import TutorialOverlay from './components/TutorialOverlay'
import TeacherDashboard from './components/TeacherDashboard'
import StudentDashboard from './components/StudentDashboard'
import StudentClassesPage from './components/StudentClassesPage'
import ClassPage from './components/ClassPage'
import AssignmentDetailPage from './components/AssignmentDetailPage'
import StudentDetailPage from './components/StudentDetailPage'
import StudentAssignmentPage from './components/StudentAssignmentPage'
import RecordingPage from './components/RecordingPage'

// Auth-protected layout with Header
function AuthLayout() {
  const { user, userRole, isLoading, handleLogout } = useApp()

  if (isLoading) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <TutorialProvider>
      <Header user={user} userRole={userRole} onLogout={handleLogout} />
      <Outlet />
      {userRole === 'student' && <TutorialOverlay />}
    </TutorialProvider>
  )
}

// Login route
function LoginRoute() {
  const { user, isLoading, handleLogin } = useApp()

  if (isLoading) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <LoginPage onLogin={handleLogin} />
}

// Dashboard - teacher or student view based on role
function DashboardRoute() {
  const { user, userRole, currentStudentId } = useApp()
  const navigate = useNavigate()

  if (userRole === 'teacher') {
    return (
      <TeacherDashboard
        user={user}
        onClassSelect={(classItem) =>
          navigate(`/teacher/class/${encodeURIComponent(classItem.name)}`)
        }
      />
    )
  }

  if (userRole === 'student' && currentStudentId) {
    return (
      <StudentClassesPage
        user={{ id: currentStudentId, email: user.email }}
        onClassSelect={(classItem) =>
          navigate(`/class/${classItem.id}`, { state: { classItem } })
        }
      />
    )
  }

  return <div className="loading-container"><div>Loading...</div></div>
}

// Student: assignments list within a class
function StudentAssignmentsRoute() {
  const { user, currentStudentId } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { classId } = useParams()
  const [selectedClass, setSelectedClass] = useState(location.state?.classItem || null)
  const [loading, setLoading] = useState(!location.state?.classItem)

  useEffect(() => {
    if (!selectedClass && classId) {
      getClassById(classId).then(data => {
        if (data) {
          setSelectedClass(data)
        } else {
          navigate('/dashboard', { replace: true })
        }
        setLoading(false)
      })
    }
  }, [classId])

  if (loading || !selectedClass) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  return (
    <StudentDashboard
      user={{ id: currentStudentId, email: user.email }}
      selectedClass={selectedClass}
      onAssignmentSelect={(assignment) =>
        navigate(
          `/class/${classId}/assignment/${assignment.id}`,
          { state: { assignment, classItem: selectedClass } }
        )
      }
      onBackToClasses={() => navigate('/dashboard')}
    />
  )
}

// Student: assignment detail page
function StudentAssignmentRoute() {
  const { currentStudentId } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { classId, assignmentId } = useParams()

  // Use route state if available, otherwise minimal object (component fetches internally)
  const assignment = location.state?.assignment || { id: assignmentId }

  return (
    <StudentAssignmentPage
      assignment={assignment}
      studentId={currentStudentId}
      onBack={() =>
        navigate(`/class/${classId}`, { state: { classItem: location.state?.classItem } })
      }
      onViewRecording={(a) =>
        navigate(
          `/class/${classId}/assignment/${assignmentId}/record`,
          { state: { assignment: a, classItem: location.state?.classItem } }
        )
      }
    />
  )
}

// Student: recording page
function RecordingRoute() {
  const { currentStudentId } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { classId, assignmentId } = useParams()
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stateAssignment = location.state?.assignment
    if (stateAssignment?.id && stateAssignment?.title) {
      setAssignment(stateAssignment)
      setLoading(false)
      return
    }

    // Fetch full assignment data for title display
    getAssignmentById(assignmentId).then(data => {
      if (data) {
        setAssignment(data)
      } else {
        navigate('/dashboard', { replace: true })
      }
      setLoading(false)
    })
  }, [assignmentId])

  if (loading || !assignment) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  return (
    <RecordingPage
      assignment={assignment}
      studentId={currentStudentId}
      onBack={() =>
        navigate(
          `/class/${classId}/assignment/${assignmentId}`,
          { state: { assignment, classItem: location.state?.classItem } }
        )
      }
    />
  )
}

// Teacher: class page
function TeacherClassRoute() {
  const navigate = useNavigate()
  const { className } = useParams()
  const decodedClassName = decodeURIComponent(className)

  return (
    <ClassPage
      className={decodedClassName}
      onBack={() => navigate('/dashboard')}
      onViewAssignment={(assignment) =>
        navigate(
          `/teacher/class/${className}/assignment/${assignment.id}`,
          { state: { assignment } }
        )
      }
      onViewStudent={(student) =>
        navigate(
          `/teacher/class/${className}/student/${student.id}`,
          { state: { student } }
        )
      }
    />
  )
}

// Teacher: assignment detail page
function TeacherAssignmentRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { className, assignmentId } = useParams()
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stateAssignment = location.state?.assignment
    if (stateAssignment?.id && stateAssignment?.title) {
      setAssignment(stateAssignment)
      setLoading(false)
      return
    }

    getAssignmentById(assignmentId).then(data => {
      if (data) {
        setAssignment(data)
      } else {
        navigate('/dashboard', { replace: true })
      }
      setLoading(false)
    })
  }, [assignmentId])

  if (loading || !assignment) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  return (
    <AssignmentDetailPage
      assignment={assignment}
      onBack={() => navigate(`/teacher/class/${className}`)}
      onViewStudent={(student) =>
        navigate(
          `/teacher/class/${className}/assignment/${assignmentId}/student/${student.id}`,
          { state: { student, assignment } }
        )
      }
    />
  )
}

// Teacher: student detail page (from assignment context)
function TeacherStudentFromAssignmentRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { className, assignmentId, studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stateStudent = location.state?.student
    if (stateStudent?.id && stateStudent?.name) {
      setStudent(stateStudent)
      setLoading(false)
      return
    }

    getStudentById(studentId).then(data => {
      if (data) {
        setStudent({ id: data.id, name: data.name, email: data.email })
      } else {
        navigate('/dashboard', { replace: true })
      }
      setLoading(false)
    })
  }, [studentId])

  if (loading || !student) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  return (
    <StudentDetailPage
      student={student}
      className={decodeURIComponent(className)}
      onBack={() =>
        navigate(
          `/teacher/class/${className}/assignment/${assignmentId}`,
          { state: { assignment: location.state?.assignment } }
        )
      }
    />
  )
}

// Teacher: student detail page (from class context, no assignment)
function TeacherStudentFromClassRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { className, studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stateStudent = location.state?.student
    if (stateStudent?.id && stateStudent?.name) {
      setStudent(stateStudent)
      setLoading(false)
      return
    }

    getStudentById(studentId).then(data => {
      if (data) {
        setStudent({ id: data.id, name: data.name, email: data.email })
      } else {
        navigate('/dashboard', { replace: true })
      }
      setLoading(false)
    })
  }, [studentId])

  if (loading || !student) {
    return <div className="loading-container"><div>Loading...</div></div>
  }

  return (
    <StudentDetailPage
      student={student}
      className={decodeURIComponent(className)}
      onBack={() => navigate(`/teacher/class/${className}`)}
    />
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<AuthLayout />}>
        <Route path="/dashboard" element={<DashboardRoute />} />

        {/* Student routes */}
        <Route path="/class/:classId" element={<StudentAssignmentsRoute />} />
        <Route path="/class/:classId/assignment/:assignmentId" element={<StudentAssignmentRoute />} />
        <Route path="/class/:classId/assignment/:assignmentId/record" element={<RecordingRoute />} />

        {/* Teacher routes */}
        <Route path="/teacher/class/:className" element={<TeacherClassRoute />} />
        <Route path="/teacher/class/:className/assignment/:assignmentId" element={<TeacherAssignmentRoute />} />
        <Route path="/teacher/class/:className/assignment/:assignmentId/student/:studentId" element={<TeacherStudentFromAssignmentRoute />} />
        <Route path="/teacher/class/:className/student/:studentId" element={<TeacherStudentFromClassRoute />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
