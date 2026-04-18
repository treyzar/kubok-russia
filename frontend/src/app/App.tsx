import { useState } from 'react'

import { AuthPage } from '@/pages/auth'
import { HomePage } from '@/pages/home'
import { type AuthUser, getStoredUser, logoutMock } from '@/features/mock-auth/model/mock-auth'

export function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  if (!user) {
    return <AuthPage onAuthSuccess={setUser} />
  }

  return (
    <HomePage
      onLogout={() => {
        logoutMock()
        setUser(null)
      }}
      user={user}
    />
  )
}
