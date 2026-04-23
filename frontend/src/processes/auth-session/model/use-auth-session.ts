import { useState } from 'react'

import { type AuthUser, getStoredUser, logoutMock, setStoredUser } from '@entities/user'
import { createUser } from '@shared/api'

const API_USER_ID_STORAGE_KEY_PREFIX = 'kubok26.api-user-id'

type UseAuthSessionResult = {
  user: AuthUser | null
  signIn: (authUser: AuthUser) => void
  signOut: () => void
  updateUserBalance: (balance: number) => void
}

export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  function signIn(authUser: AuthUser): void {
    setUser(authUser)
    setStoredUser(authUser)
  }

  function signOut(): void {
    logoutMock()
    setUser(null)
  }

  function updateUserBalance(balance: number): void {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser
      }

      const nextUser = { ...previousUser, balance }
      setStoredUser(nextUser)
      return nextUser
    })
  }

  return {
    user,
    signIn,
    signOut,
    updateUserBalance,
  }
}

export async function resolveApiUserId(
  userId: string,
  userName: string,
  userBalance: number,
  role: 'USER' | 'ADMIN' = 'USER',
): Promise<number> {
  const numericId = Number(userId)
  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId
  }

  const storageKey = `${API_USER_ID_STORAGE_KEY_PREFIX}:${userId}`
  const fromStorage = Number(window.localStorage.getItem(storageKey))
  if (Number.isInteger(fromStorage) && fromStorage > 0) {
    return fromStorage
  }

  const createdUser = await createUser({
    name: userName,
    balance: userBalance,
    role,
  })
  window.localStorage.setItem(storageKey, String(createdUser.id))
  return createdUser.id
}
