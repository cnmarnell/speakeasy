import { useState, useEffect } from 'react'
import { getClasses } from '../data/supabaseData'

function TeacherDashboard({ onSwitchToStudent, onEnterClass }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classData = await getClasses()
        setClasses(classData)
      } catch (error) {
        console.error('Error fetching classes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [])

  if (loading) {
    return <div className="teacher-dashboard">Loading...</div>
  }

  return (
    <div className="teacher-dashboard">
      <h2 className="dashboard-title">Teacher Dashboard</h2>
      <div className="dashboard-boxes">
        {classes.map(cls => (
          <div key={cls.id} className="dashboard-box">
            <h3>{cls.name}</h3>
            <button className="enter-class-btn" onClick={() => onEnterClass(cls.name)}>Enter Class</button>
          </div>
        ))}
      </div>
      <button className="student-dashboard-btn" onClick={onSwitchToStudent}>
        Student Dashboard
      </button>
    </div>
  )
}

export default TeacherDashboard