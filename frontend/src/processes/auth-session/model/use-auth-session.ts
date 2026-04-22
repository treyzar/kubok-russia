import { useState } from 'react'

import { type AuthUser, getStoredUser, logoutMock } from '@entities/user'

type UseAuthSessionResult = {
  user: AuthUser | null
  signIn: (authUser: AuthUser) => void
  signOut: () => void
}

export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  function signIn(authUser: AuthUser): void {
    setUser(authUser)
  }

  function signOut(): void {
    logoutMock()
    setUser(null)
  }

  return {
    user,
    signIn,
    signOut,
  }
}
