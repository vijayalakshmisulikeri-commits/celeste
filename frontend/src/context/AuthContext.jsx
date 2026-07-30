// context/AuthContext.jsx
// ------------------------
// React Context is how you share state (like "who is logged in") across
// many components WITHOUT manually passing it down as props through
// every single layer ("prop drilling"). Any component wrapped in
// <AuthProvider> can call useAuth() and get the current user directly.

import { createContext, useContext, useState, useEffect } from 'react'
import { api, saveToken, clearToken, hasToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while we check for an existing session

  useEffect(() => {
    // On first load: if a token is already saved (from a previous visit),
    // verify it's still valid by fetching the user's own profile.
    // This is what makes "staying logged in after refresh" work.
    async function restoreSession() {
      if (hasToken()) {
        try {
          const me = await api.me()
          setUser(me)
        } catch {
          clearToken() // token expired or invalid -- clear it
        }
      }
      setLoading(false)
    }
    restoreSession()
  }, [])

  async function login(email, password) {
    const { access_token } = await api.login(email, password)
    saveToken(access_token)
    const me = await api.me()
    setUser(me)
  }

  async function register(name, email, password) {
    await api.register(name, email, password)
    await login(email, password) // auto-login right after signup
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  function updateUser(updated) {
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
