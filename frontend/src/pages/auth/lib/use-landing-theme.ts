import { useEffect, useState } from 'react'
import type { LandingTheme } from '../model/types'

const STORAGE_KEY = 'landing-theme'

export function useLandingTheme() {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme(): void {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
