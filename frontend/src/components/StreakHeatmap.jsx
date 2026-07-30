// StreakHeatmap.jsx
// ------------------
// A compact version of GitHub's contribution graph, scoped to one
// task's completion history. Each column is a week, each cell a day,
// shaded darker the more "current" it is (here: simply done vs not,
// since a single task only has one completion per day -- unlike
// GitHub's commit-count intensity).

import './StreakHeatmap.css'

const WEEKS = 12 // ~3 months back

function buildGrid(completionDates) {
  const doneSet = new Set(completionDates)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start from (WEEKS*7) days ago, aligned to the most recent Sunday
  // so columns line up as full weeks like GitHub's graph does.
  const totalDays = WEEKS * 7
  const start = new Date(today)
  start.setDate(start.getDate() - totalDays + 1)
  start.setDate(start.getDate() - start.getDay()) // back up to Sunday

  const days = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10)
    days.push({ date: iso, done: doneSet.has(iso), isFuture: cursor > today })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Group into columns of 7 (weeks)
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

export default function StreakHeatmap({ completionDates }) {
  const weeks = buildGrid(completionDates || [])

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div className="heatmap-col" key={wi}>
            {week.map((day) => (
              <div
                key={day.date}
                className={`heatmap-cell ${day.done ? 'done' : ''}`}
                title={`${day.date}${day.done ? ' — done' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heatmap-cell" />
        <span className="heatmap-cell done" />
        <span>More</span>
      </div>
    </div>
  )
}
