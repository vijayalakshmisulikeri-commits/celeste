// DateStrip.jsx
// --------------
// A horizontal row of the current week's days, with today highlighted
// as a filled pill -- directly inspired by the reference screenshot's
// "Today's Tasks" date picker. Purely visual/orientation for now (shows
// which day it is at a glance); doesn't filter tasks by day.

import './DateStrip.css'

function getWeekDays() {
  const today = new Date()
  const days = []
  // Start from 3 days before today through 3 days after, so today
  // sits in the middle of a 7-day strip.
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    days.push(d)
  }
  return days
}

export default function DateStrip() {
  const days = getWeekDays()
  const todayStr = new Date().toDateString()

  return (
    <div className="date-strip">
      {days.map((d) => {
        const isToday = d.toDateString() === todayStr
        return (
          <div key={d.toISOString()} className={`date-pill ${isToday ? 'today' : ''}`}>
            <span className="date-month">{d.toLocaleDateString(undefined, { month: 'short' })}</span>
            <span className="date-num">{d.getDate()}</span>
          </div>
        )
      })}
    </div>
  )
}
