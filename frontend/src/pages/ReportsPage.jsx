import { useState } from 'react'
import client from '../api/client'

export default function ReportsPage() {
  const [className, setClassName] = useState('')
  const [result, setResult] = useState(null)

  const getReport = async () => {
    const { data } = await client.get('/reports/summary', { params: className ? { class_name: className } : {} })
    setResult(data)
  }

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Students', result.total_students],
      ['Attendance Records', result.attendance_records],
      ['Present', result.present],
      ['Late', result.late],
      ['Absent', result.absent],
      ['Liveness Passed', result.liveness_passed],
      ['Average Confidence', result.average_confidence],
    ]
    const text = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendance-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-head"><h1>Reports</h1><p className="muted">Filter, summarize, and export attendance performance.</p></div>
      <div className="panel filter-row">
        <input placeholder="Filter by class name" value={className} onChange={(e) => setClassName(e.target.value)} />
        <button onClick={getReport}>Generate</button>
        <button onClick={exportReport} disabled={!result}>Export CSV</button>
      </div>
      {result && (
        <div className="stats-grid">
          <div className="stat-card"><span>Total Students</span><strong>{result.total_students}</strong></div>
          <div className="stat-card"><span>Records</span><strong>{result.attendance_records}</strong></div>
          <div className="stat-card"><span>Present</span><strong>{result.present}</strong></div>
          <div className="stat-card"><span>Late</span><strong>{result.late}</strong></div>
          <div className="stat-card"><span>Absent</span><strong>{result.absent}</strong></div>
          <div className="stat-card"><span>Liveness Passed</span><strong>{result.liveness_passed}</strong></div>
          <div className="stat-card"><span>Average Confidence</span><strong>{result.average_confidence}%</strong></div>
        </div>
      )}
    </div>
  )
}
