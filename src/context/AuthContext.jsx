import { createContext, useContext, useState, useCallback } from 'react'

// Fixed credentials for the lab admin login (no backend, per requirements).
const FIXED_USERNAME = 'admin'
const FIXED_PASSWORD = '123'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(
    () => sessionStorage.getItem('spdc_auth') === 'true'
  )
  const [error, setError] = useState('')

  const login = useCallback((username, password) => {
    if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
      sessionStorage.setItem('spdc_auth', 'true')
      setIsAuthed(true)
      setError('')
      return true
    }
    setError('Invalid username or password.')
    return false
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('spdc_auth')
    setIsAuthed(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthed, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export { FIXED_USERNAME, FIXED_PASSWORD }
