import { useCallback, useEffect, useState } from 'react'

const THEME_ORDER = ['light', 'dark']
const STORAGE_KEY = 'theme'

function getInitialTheme() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return THEME_ORDER.includes(stored) ? stored : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const idx = THEME_ORDER.indexOf(current)
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length]
    })
  }, [])

  return [theme, toggleTheme]
}