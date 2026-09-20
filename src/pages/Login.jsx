import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, error, isAuthed } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthed) return <Navigate to="/dashboard" replace />

  const handleSubmit = (e) => {
    e.preventDefault()
    if (login(username, password)) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-mark large">RJ</div>
        <h1>RAJ PATHOLOGY & DIAGNOSTIC CENTRE</h1>
        <p className="subtitle">Laboratory Information System</p>

        <label>Username</label>
        <input
          type="text"
          placeholder="admin"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block">
          Sign In
        </button>

        <p className="hint">
          Demo credentials — username: <code>admin</code>, password:{' '}
          <code>123</code>
        </p>
      </form>
    </div>
  )
}
