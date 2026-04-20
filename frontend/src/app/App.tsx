import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { type AuthUser, getStoredUser, logoutMock } from '@/features/mock-auth/model/mock-auth'
import { AuthLandingHero } from '@/pages/auth/ui/auth-landing-hero'
import { AuthLoginForm } from '@/pages/auth/ui/auth-login-form'
import { HomePage } from '@/pages/home'

export function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  function handleAuthSuccess(authUser: AuthUser): void {
    setUser(authUser)
    navigate('/games', { replace: true })
  }

  function handleLogout(): void {
    logoutMock()
    setUser(null)
    navigate('/', { replace: true })
  }

  return (
    <Routes>
      <Route path="/" element={<AuthLandingHero onEnterLogin={() => navigate('/auth')} />} />
      <Route
        path="/auth"
        element={user ? <Navigate replace to="/games" /> : <AuthLoginForm onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path="/games"
        element={user ? <HomePage onLogout={handleLogout} user={user} /> : <Navigate replace to="/auth" />}
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
