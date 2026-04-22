import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { type AuthUser } from '@entities/user'

import { routePaths } from '../config/route-paths'

type PublicOnlyRouteProps = {
  user: AuthUser | null
  children: ReactNode
}

type PrivateRouteProps = {
  user: AuthUser | null
  children: (user: AuthUser) => ReactNode
}

export function PublicOnlyRoute({ user, children }: PublicOnlyRouteProps) {
  if (user) {
    return <Navigate replace to={routePaths.games} />
  }

  return children
}

export function PrivateRoute({ user, children }: PrivateRouteProps) {
  if (!user) {
    return <Navigate replace to={routePaths.root} />
  }

  return children(user)
}
