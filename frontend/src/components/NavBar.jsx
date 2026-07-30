import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './NavBar.css'

export default function NavBar() {
  const { user, logout } = useAuth()

  return (
    <header className="navbar">
      <div className="navbar-brand">Celeste</div>
      <nav className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          Tasks
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
          Profile
        </NavLink>
      </nav>
      <div className="navbar-user">
        <span className="navbar-name">{user?.name}</span>
        <button className="navbar-logout" onClick={logout}>Log out</button>
      </div>
    </header>
  )
}
