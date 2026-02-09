import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClassByName, getClassAnalytics } from '../data/supabaseData'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
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
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [decodedClassName])

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
  const scoreDistData = [
    { range: '0-20', count: analytics.scoreDistribution[0] },
    { range: '21-40', count: analytics.scoreDistribution[1] },
    { range: '41-60', count: analytics.scoreDistribution[2] },
    { range: '61-80', count: analytics.scoreDistribution[3] },
    { range: '81-100', count: analytics.scoreDistribution[4] }
  ]

  const assignmentsWithScores = analytics.assignments.filter(a => a.avgScore !== null)
  const assignmentsWithFillers = analytics.assignments.filter(a => a.avgFillerWords !== null)

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

      {/* Charts */}
      <div className="analytics-charts">
        {/* Chart 1: Average Score Over Time */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-title">Class Average Score Over Time</h3>
          {assignmentsWithScores.length > 0 ? (
            <div className="analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assignmentsWithScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="title" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgScore" name="Avg Score" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ fill: CHART_COLORS.primary, r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No graded assignments yet" />}
        </div>

        {/* Chart 2: Score Distribution */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-title">Score Distribution</h3>
          {hasSubmissions ? (
            <div className="analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No scores to display" />}
        </div>

        {/* Chart 3: Criteria Breakdown */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-title">Criteria Breakdown</h3>
          {analytics.criteriaBreakdown && analytics.criteriaBreakdown.length > 0 ? (
            <div className="analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.criteriaBreakdown} outerRadius="70%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Radar name="Avg Score %" dataKey="avgScore" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No structured criteria data available" />}
        </div>

        {/* Chart 4: Filler Word Trends */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-title">Filler Word Trends</h3>
          {assignmentsWithFillers.length > 0 ? (
            <div className="analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assignmentsWithFillers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="title" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgFillerWords" name="Avg Filler Words" stroke={CHART_COLORS.red} strokeWidth={2.5} dot={{ fill: CHART_COLORS.red, r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No filler word data yet" />}
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
