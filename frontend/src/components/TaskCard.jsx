import { useState } from 'react'
import PriorityDots from './PriorityDots'
import StreakHeatmap from './StreakHeatmap'
import './TaskCard.css'

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString()
}

// Converts an ISO datetime string into the yyyy-mm-dd format an
// <input type="date"> needs.
function toDateInputValue(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().slice(0, 10)
}

export default function TaskCard({ task, onArchive, onDelete, onEdit, onAddSubtask, onToggleSubtask, onDeleteSubtask }) {
  const [subtaskInput, setSubtaskInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [editing, setEditing] = useState(false)

  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [editPriority, setEditPriority] = useState(task.priority)
  const [editDue, setEditDue] = useState(toDateInputValue(task.due_date))
  const [editRecurring, setEditRecurring] = useState(task.recurring)

  const doneCount = task.subtasks.filter((s) => s.done).length
  const totalCount = task.subtasks.length

  function handleAddSubtask(e) {
    e.preventDefault()
    if (!subtaskInput.trim()) return
    onAddSubtask(task.id, subtaskInput.trim())
    setSubtaskInput('')
  }

  function startEdit() {
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority)
    setEditDue(toDateInputValue(task.due_date))
    setEditRecurring(task.recurring)
    setEditing(true)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    if (!editTitle.trim()) return
    onEdit(task.id, {
      title: editTitle.trim(),
      description: editDesc,
      priority: editPriority,
      due_date: editDue ? new Date(editDue).toISOString() : null,
      recurring: editRecurring,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="task-card editing">
        <form onSubmit={handleSaveEdit} className="edit-form">
          <input
            className="edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="edit-desc"
            placeholder="Description (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
          />
          <div className="edit-row">
            <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
            <label className="recurring-check">
              <input
                type="checkbox"
                checked={editRecurring}
                onChange={(e) => setEditRecurring(e.target.checked)}
              />
              Every day
            </label>
          </div>
          <div className="edit-actions">
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn-primary edit-save">Save</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`task-card ${task.recurring && task.done_today ? 'done-today' : ''}`}>
      <div className="task-main">
        <PriorityDots priority={task.priority} />
        <div className="task-content">
          <div className="task-title-row">
            <h3 className="task-title">
              {task.recurring && <span className="recurring-icon" title="Repeats every day">↻</span>}
              {task.title}
            </h3>
            <div className="task-badges">
              {task.streak > 1 && (
                <button className="streak-badge" onClick={() => setShowHeatmap(!showHeatmap)} title="View streak history">
                  🔥 {task.streak}
                </button>
              )}
              {task.due_date && (
                <span className={`task-due ${isOverdue(task.due_date) ? 'overdue' : ''}`}>
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
          {task.description && <p className="task-desc">{task.description}</p>}

          {showHeatmap && <StreakHeatmap completionDates={task.completion_dates} />}

          {totalCount > 0 && (
            <button className="subtask-toggle" onClick={() => setExpanded(!expanded)}>
              {doneCount}/{totalCount} subtasks {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
        <div className="task-actions">
          <button className="icon-btn" title="Edit task" onClick={startEdit}>✎</button>
          <button
            className={`icon-btn ${task.recurring && task.done_today ? 'icon-btn-active' : ''}`}
            title={task.recurring ? (task.done_today ? 'Done today — click to undo' : 'Mark done for today') : 'Mark done / archive'}
            onClick={() => onArchive(task.id)}
          >
            ✓
          </button>
          <button className="icon-btn danger" title="Delete task" onClick={() => onDelete(task.id)}>✕</button>
        </div>
      </div>

      {(expanded || totalCount === 0) && (
        <div className="subtasks">
          {task.subtasks.map((s) => (
            <div key={s.id} className="subtask-row">
              <label>
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) => onToggleSubtask(task.id, s.id, e.target.checked)}
                />
                <span className={s.done ? 'done' : ''}>{s.title}</span>
              </label>
              <button className="subtask-remove" onClick={() => onDeleteSubtask(task.id, s.id)}>✕</button>
            </div>
          ))}
          <form className="subtask-add" onSubmit={handleAddSubtask}>
            <input
              placeholder="Add a checklist item…"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
            />
            <button type="submit">+</button>
          </form>
        </div>
      )}
    </div>
  )
}
