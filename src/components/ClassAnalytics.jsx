import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClassByName, getClassAnalytics, getAssignmentAnalytics } from '../data/supabaseData'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './ClassAnalytics.css'

const CHART_COLORS = {
  primary: '#8B1538',
  gold: '#D4AF37',
  blue: '#0a7bb8',
  green: '#15803d',
  orange: '#d97706',
  red: '#dc2626'
}

const STUDENT_COLORS = [
  '#8B1538', '#0a7bb8', '#15803d', '#d97706', '#dc2626',
  '#7c3aed', '#0891b2', '#c2410c', '#4f46e5', '#059669'
]

function EmptyState({ message }) {
  return (
    <div className="analytics-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p>{message || 'No data yet'}</p>
    </div>
  )
}

function ClassAnalytics() {
  const { className } = useParams()
  const navigate = useNavigate()
  const decodedClassName = decodeURIComponent(className)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [assignmentAnalytics, setAssignmentAnalytics] = useState(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const classData = await getClassByName(decodedClassName)
        if (!classData) {
          setError('Class not found')
          setLoading(false)
          return
        }
        const data = await getClassAnalytics(classData.id)
        setAnalytics(data)
        // Auto-select first assignment if available
        if (data.assignments && data.assignments.length > 0) {
          setSelectedAssignmentId(data.assignments[0].id)
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [decodedClassName])

  // Fetch per-assignment analytics when selection changes
  useEffect(() => {
    if (!selectedAssignmentId) return
    const fetchAssignmentData = async () => {
      setAssignmentLoading(true)
      try {
        const data = await getAssignmentAnalytics(selectedAssignmentId)
        setAssignmentAnalytics(data)
      } catch (err) {
        console.error('Error fetching assignment analytics:', err)
      } finally {
        setAssignmentLoading(false)
      }
    }
    fetchAssignmentData()
  }, [selectedAssignmentId])

  // Build chart data for per-assignment improvement (View 1)
  const { scoreByAttempt, fillerByAttempt, studentNames, showAverage } = useMemo(() => {
    if (!assignmentAnalytics || assignmentAnalytics.length === 0) {
      return { scoreByAttempt: [], fillerByAttempt: [], studentNames: [], showAverage: false }
    }

    const students = assignmentAnalytics.filter(s => s.attempts.length > 0)
    const names = students.map(s => s.studentName)
    const useAverage = students.length > 6

    // Find max attempt number
    const maxAttempt = Math.max(...students.flatMap(s => s.attempts.map(a => a.attemptNumber)))

    const scoreData = []
    const fillerData = []

    for (let attempt = 1; attempt <= maxAttempt; attempt++) {
      const scorePoint = { attempt: `Attempt ${attempt}` }
      const fillerPoint = { attempt: `Attempt ${attempt}` }

      if (useAverage) {
        const scores = students
          .map(s => s.attempts.find(a => a.attemptNumber === attempt)?.speechContentScore)
          .filter(v => v != null)
        const fillers = students
          .map(s => s.attempts.find(a => a.attemptNumber === attempt)?.fillerWordCount)
          .filter(v => v != null)
        scorePoint['Class Average'] = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : null
        fillerPoint['Class Average'] = fillers.length > 0
          ? Math.round((fillers.reduce((a, b) => a + b, 0) / fillers.length) * 10) / 10
          : null
      } else {
        students.forEach(s => {
          const a = s.attempts.find(a => a.attemptNumber === attempt)
          scorePoint[s.studentName] = a?.speechContentScore ?? null
          fillerPoint[s.studentName] = a?.fillerWordCount ?? null
        })
      }

      scoreData.push(scorePoint)
      fillerData.push(fillerPoint)
    }

    return {
      scoreByAttempt: scoreData,
      fillerByAttempt: fillerData,
      studentNames: useAverage ? ['Class Average'] : names,
      showAverage: useAverage
    }
  }, [assignmentAnalytics])

  // Build chart data for macro trends (View 2)
  const { macroScoreData, macroFillerData } = useMemo(() => {
    if (!analytics || !analytics.assignments) return { macroScoreData: [], macroFillerData: [] }
    const assignmentsWithScores = analytics.assignments.filter(a => a.avgScore !== null)
    const assignmentsWithFillers = analytics.assignments.filter(a => a.avgFillerWords !== null)

    return {
      macroScoreData: assignmentsWithScores.map(a => ({
        assignment: a.title,
        'Class Avg Score': a.avgScore
      })),
      macroFillerData: assignmentsWithFillers.map(a => ({
        assignment: a.title,
        'Avg Filler Words': a.avgFillerWords
      }))
    }
  }, [analytics])

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <div className="cp-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <p>Error: {error}</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    )
  }

  const hasSubmissions = analytics.totalSubmissions > 0

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-content">
          <div className="analytics-header-left">
            <h2 className="analytics-title">{decodedClassName}</h2>
            <p className="analytics-subtitle">Class Analytics Dashboard</p>
          </div>
          <button className="analytics-back-btn" onClick={() => navigate(`/teacher/class/${className}`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Class
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="analytics-overview">
        <div className="analytics-card">
          <div className="analytics-card-icon students">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="analytics-card-value">{analytics.totalStudents}</span>
          <span className="analytics-card-label">Total Students</span>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon submissions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <polyline points="16 13 12 17 8 13"/>
            </svg>
          </div>
          <span className="analytics-card-value">{analytics.totalSubmissions}</span>
          <span className="analytics-card-label">Total Submissions</span>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon score">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <span className="analytics-card-value">{analytics.classAverageScore}%</span>
          <span className="analytics-card-label">Class Average</span>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon filler">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </div>
          <span className="analytics-card-value">{analytics.avgFillerWords}</span>
          <span className="analytics-card-label">Avg Filler Words</span>
        </div>
      </div>

      {/* View 1: Per-Assignment Improvement */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h3 className="analytics-section-title">Per-Assignment Improvement</h3>
          <select
            className="analytics-assignment-select"
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
          >
            {analytics.assignments.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        <div className="analytics-charts">
          {/* Chart A: Speech Content Score by Attempt */}
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Speech Content Score by Attempt</h3>
            {assignmentLoading ? (
              <div className="analytics-empty"><p>Loading...</p></div>
            ) : scoreByAttempt.length > 0 ? (
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreByAttempt}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} label={{ value: 'Score (0-4)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <Tooltip />
                    <Legend />
                    {studentNames.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={showAverage ? CHART_COLORS.primary : STUDENT_COLORS[i % STUDENT_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="No attempt data for this assignment" />}
          </div>

          {/* Chart B: Filler Word Count by Attempt */}
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Filler Word Count by Attempt</h3>
            {assignmentLoading ? (
              <div className="analytics-empty"><p>Loading...</p></div>
            ) : fillerByAttempt.length > 0 ? (
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fillerByAttempt}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Filler Words', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <Tooltip />
                    <Legend />
                    {studentNames.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={showAverage ? CHART_COLORS.red : STUDENT_COLORS[i % STUDENT_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="No filler word data for this assignment" />}
          </div>
        </div>
      </div>

      {/* View 2: Macro Assignment-to-Assignment Trends */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h3 className="analytics-section-title">Assignment-to-Assignment Trends</h3>
        </div>

        <div className="analytics-charts">
          {/* Chart C: Class Avg Speech Content Score across assignments */}
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Class Average Score by Assignment</h3>
            {macroScoreData.length > 0 ? (
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={macroScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="assignment" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Class Avg Score" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ fill: CHART_COLORS.primary, r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="No graded assignments yet" />}
          </div>

          {/* Chart D: Class Avg Filler Word Count across assignments */}
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Class Average Filler Words by Assignment</h3>
            {macroFillerData.length > 0 ? (
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={macroFillerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="assignment" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Avg Filler Words" stroke={CHART_COLORS.red} strokeWidth={2.5} dot={{ fill: CHART_COLORS.red, r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="No filler word data yet" />}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="analytics-leaderboard">
        <div className="analytics-leaderboard-card">
          <h3 className="analytics-chart-title">Student Leaderboard</h3>
          {analytics.leaderboard && analytics.leaderboard.length > 0 ? (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Avg Score</th>
                  <th>Submissions</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {analytics.leaderboard.map((student, index) => (
                  <tr key={student.id}>
                    <td className="leaderboard-rank">{index + 1}</td>
                    <td className="leaderboard-name">{student.name}</td>
                    <td className="leaderboard-score">{student.avgScore !== null ? `${student.avgScore}%` : 'N/A'}</td>
                    <td>{student.submissions}</td>
                    <td>
                      {student.submissions > 0 && (
                        <span className={`leaderboard-trend ${student.trend}`}>
                          {student.trend === 'improving' ? '↑ Improving' : student.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState message="No students enrolled yet" />}
        </div>
      </div>
    </div>
  )
}

export default ClassAnalytics
