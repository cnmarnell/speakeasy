import { useState, useEffect } from 'react'
import { getAllStudents } from '../data/supabaseData'

function StudentSelector({ onSelectStudent, onBackToTeacher }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentData = await getAllStudents()
        setStudents(studentData)
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  if (loading) {
    return <div className="student-selector">Loading students...</div>
  }

  return (
    <div className="student-selector">
      <h2 className="selector-title">Select Student</h2>
      <div className="students-grid">
        {students.map(student => (
          <div 
            key={student.id} 
            className="student-card"
            onClick={() => onSelectStudent(student.id)}
          >
            <h3 className="student-name">{student.name}</h3>
            <p className="student-email">{student.email}</p>
            <p className="student-class">Primary Class: {student.primaryClass}</p>
            <p className="student-teacher">Teacher: {student.primaryTeacher}</p>
          </div>
        ))}
      </div>
      <button className="back-btn" onClick={onBackToTeacher}>
        Back to Teacher Dashboard
      </button>
    </div>
  )
}

export default StudentSelector