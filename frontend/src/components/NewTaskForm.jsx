import { useState } from 'react'
import './NewTaskForm.css'

export default function NewTaskForm({ onCreate }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    await onCreate({
      title: title.trim(),
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      recurring,
    })
    setTitle('')
    setPriority('medium')
    setDueDate('')
    setRecurring(false)
    setExpanded(false)
  }

  return (
    <form className="new-task-form" onSubmit={handleSubmit}>
      <input
        className="new-task-input"
        placeholder="What needs doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setExpanded(true)}
      />
      {expanded && (
        <div className="new-task-options">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <label className="recurring-check">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Every day
          </label>
          <button type="submit" className="btn-primary new-task-submit">Add task</button>
        </div>
      )}
    </form>
  )
}
