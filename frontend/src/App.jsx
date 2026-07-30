import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

// A "protected route" -- if there's no logged-in user, bounce to /login
// instead of rendering the page. This is what stops someone from just
// typing /dashboard in the URL bar without being authenticated.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="route-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// The opposite: if you're ALREADY logged in, don't show login/register
// again -- send straight to the dashboard.
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="route-loading">Loading…</div>
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
