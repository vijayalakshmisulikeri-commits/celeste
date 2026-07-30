import { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'
import NewTaskForm from '../components/NewTaskForm'
import TaskCard from '../components/TaskCard'
import ProgressBar from '../components/ProgressBar'
import QuoteToast from '../components/QuoteToast'
import DateStrip from '../components/DateStrip'
import { api } from '../api'
import './Dashboard.css'

const SECTIONS = [
  { key: 'personal', title: 'Personal & habits', hint: 'Routines and habitual tasks' },
  { key: 'academic', title: 'Academic', hint: 'Coursework, assignments, exams' },
  { key: 'reminder', title: 'Reminders', hint: "Things 1-2 weeks out, don't lose track" },
]

export default function Dashboard() {
  const [allTasks, setAllTasks] = useState([]) // active + archived, for progress math
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuote, setShowQuote] = useState(false)
  const [expandedArchive, setExpandedArchive] = useState({})

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    try {
      const all = await api.listTasks(true)
      setAllTasks(all)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function replaceTask(updated) {
    setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleCreate(category, payload) {
    const created = await api.createTask({ ...payload, category })
    setAllTasks((prev) => [...prev, created])
  }

  async function handleComplete(id) {
    const updated = await api.completeTask(id)
    replaceTask(updated)
    setShowQuote(true)
  }

  async function handleUnarchive(id) {
    const updated = await api.updateTask(id, { archived: false })
    replaceTask(updated)
  }

  async function handleDelete(id) {
    await api.deleteTask(id)
    setAllTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleEdit(id, payload) {
    const updated = await api.updateTask(id, payload)
    replaceTask(updated)
  }

  async function handleAddSubtask(taskId, title) {
    const updated = await api.addSubtask(taskId, title)
    replaceTask(updated)
  }

  async function handleToggleSubtask(taskId, subtaskId, done) {
    const updated = await api.toggleSubtask(taskId, subtaskId, done)
    replaceTask(updated)
  }

  async function handleDeleteSubtask(taskId, subtaskId) {
    const updated = await api.deleteSubtask(taskId, subtaskId)
    replaceTask(updated)
  }

  const totalDone = allTasks.filter((t) => t.archived).length
  const totalCount = allTasks.length

  return (
    <div className="page">
      <NavBar />
      <main className="dashboard">
        <div className="dashboard-header">
          <h1>Your tasks</h1>
          <p className="dashboard-sub">Sorted by priority, then by what's due soonest.</p>
          <DateStrip />
          {totalCount > 0 && (
            <ProgressBar done={totalDone} total={totalCount} label="Overall completion" />
          )}
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        {loading ? (
          <p className="dashboard-loading">Loading…</p>
        ) : (
          SECTIONS.map((section) => {
            const sectionTasks = allTasks.filter((t) => t.category === section.key)
            const active = sectionTasks.filter((t) => !t.archived)
            const archived = sectionTasks.filter((t) => t.archived)
            const isExpanded = expandedArchive[section.key]

            return (
              <section key={section.key} className={`task-section section-${section.key}`}>
                <div className="section-header">
                  <div>
                    <h2>{section.title}</h2>
                    <p className="section-hint">{section.hint}</p>
                  </div>
                </div>

                {sectionTasks.length > 0 && (
                  <ProgressBar done={archived.length} total={sectionTasks.length} label="Section progress" />
                )}

                <NewTaskForm onCreate={(payload) => handleCreate(section.key, payload)} />

                {active.length === 0 ? (
                  <div className="empty-state">Nothing here yet.</div>
                ) : (
                  <div className="task-list">
                    {active.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onArchive={handleComplete}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onAddSubtask={handleAddSubtask}
                        onToggleSubtask={handleToggleSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                      />
                    ))}
                  </div>
                )}

                {archived.length > 0 && (
                  <div className="archived-section">
                    <button
                      className="archived-toggle"
                      onClick={() => setExpandedArchive((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                    >
                      {isExpanded ? '▲' : '▼'} {archived.length} completed
                    </button>
                    {isExpanded && (
                      <div className="task-list archived">
                        {archived.map((task) => (
                          <div key={task.id} className="archived-row">
                            <span className="archived-title">
                              {task.title}
                              {task.streak > 1 && <span className="streak-badge"> 🔥 {task.streak}</span>}
                            </span>
                            <div className="archived-actions">
                              <button onClick={() => handleUnarchive(task.id)}>Restore</button>
                              <button onClick={() => handleDelete(task.id)} className="danger">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })
        )}
      </main>

      <QuoteToast visible={showQuote} onDone={() => setShowQuote(false)} />
    </div>
  )
}
