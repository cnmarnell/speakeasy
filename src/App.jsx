import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import TeacherDashboard from './components/TeacherDashboard'
import StudentDashboard from './components/StudentDashboard'
import ClassPage from './components/ClassPage'
import AssignmentDetailPage from './components/AssignmentDetailPage'
import StudentDetailPage from './components/StudentDetailPage'
import StudentAssignmentPage from './components/StudentAssignmentPage'
import RecordingPage from './components/RecordingPage'
import StudentSelector from './components/StudentSelector'

function App() {
  const [currentView, setCurrentView] = useState('teacher')
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedStudentAssignment, setSelectedStudentAssignment] = useState(null)
  const [currentStudentId, setCurrentStudentId] = useState(null)

  const handleEnterClass = (className) => {
    setSelectedClass(className)
    setCurrentView('class')
  }

  const handleBackToDashboard = () => {
    setSelectedClass(null)
    setSelectedAssignment(null)
    setSelectedStudent(null)
    setCurrentView('teacher')
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
    setCurrentView('student')
  }

  const handleViewRecording = (assignment) => {
    setSelectedStudentAssignment(assignment)
    setCurrentView('recording')
  }

  const handleBackFromRecording = () => {
    setCurrentView('studentAssignment')
  }

  const handleSelectStudent = (studentId) => {
    setCurrentStudentId(studentId)
    setCurrentView('student')
  }

  return (
    <>
      <Header />
      {currentView === 'teacher' && (
        <TeacherDashboard 
          onSwitchToStudent={() => setCurrentView('studentSelector')}
          onEnterClass={handleEnterClass}
        />
      )}
      {currentView === 'studentSelector' && (
        <StudentSelector 
          onSelectStudent={handleSelectStudent}
          onBackToTeacher={() => setCurrentView('teacher')}
        />
      )}
      {currentView === 'student' && currentStudentId && (
        <StudentDashboard 
          studentId={currentStudentId}
          onSwitchToTeacher={() => setCurrentView('teacher')}
          onViewStudentAssignment={handleViewStudentAssignment}
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