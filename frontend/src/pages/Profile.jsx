import { useState } from 'react'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import './Profile.css'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const payload = {}
      if (name !== user.name) payload.name = name
      if (password) payload.password = password

      if (Object.keys(payload).length === 0) {
        setMessage('Nothing to update.')
        return
      }

      const updated = await api.updateMe(payload)
      updateUser(updated)
      setPassword('')
      setMessage('Profile updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <NavBar />
      <main className="profile">
        <h1>Profile</h1>
        <p className="profile-sub">Update your name or password.</p>

        <div className="profile-card">
          <div className="field">
            <label>Email</label>
            <input value={user?.email || ''} disabled />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="profile-message">{message}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
