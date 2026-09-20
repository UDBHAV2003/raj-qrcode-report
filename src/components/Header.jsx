import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'

const THEMES = [
  { id: 'light', label: '☀️' },
  { id: 'dark', label: '🌙' }
]

export default function Header({ rightSlot }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">RJ</div>
        <div>
          <h1>RAJ PATHOLOGY DIAGNOSTIC CENTRE</h1>
          <p>Laboratory Information System</p>
        </div>
      </div>

      <div className="header-actions">
        {rightSlot}

        <div className="theme-switcher-pill">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-opt ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
              title={t.id.toUpperCase()}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="signed-in">
          Signed in as <strong>admin</strong>
        </span>

        <Link to="/dashboard" className="btn btn-outline">
          Dashboard
        </Link>
        <button className="btn btn-outline" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}