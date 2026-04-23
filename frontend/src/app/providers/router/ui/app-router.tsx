import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@processes/auth-session'
import { type AuthUser } from '@entities/user'
import { AuthLoginForm } from '@pages/auth'
import { AdminPage, AdminTemplateStatsDetailPage } from '@pages/admin'
import { CreateGamePage } from '@pages/create-game'
import { HomePage } from '@pages/home'
import { JoinGamePage } from '@pages/join-game'
import { LobbyPage } from '@pages/lobby'
import { NotFoundPage } from '@pages/not-found'

import { gamesLobbyPath, routePaths } from '../config/route-paths'
import { PrivateRoute, PublicOnlyRoute } from './route-guards'

export function AppRouter() {
  const navigate = useNavigate()
  const { user, signIn, signOut, updateUserBalance } = useAuthSession()

  function handleAuthSuccess(authUser: AuthUser): void {
    signIn(authUser)
    navigate(routePaths.games, { replace: true })
  }

  function handleLogout(): void {
    signOut()
    navigate(routePaths.root, { replace: true })
  }

  function handleGoToJoinGame(): void {
    navigate(routePaths.gamesJoin)
  }

  function handleBackToGames(): void {
    navigate(routePaths.games)
  }

  function handleGoToLobby(roomId: number): void {
    navigate(gamesLobbyPath(roomId))
  }

  function handleUserBalanceChange(balance: number): void {
    updateUserBalance(balance)
  }

  return (
    <Routes>
      <Route
        path={routePaths.root}
        element={
          <PublicOnlyRoute user={user}>
            <AuthLoginForm onAuthSuccess={handleAuthSuccess} />
          </PublicOnlyRoute>
        }
      />
      <Route path={routePaths.auth} element={<Navigate replace to={routePaths.root} />} />

      <Route
        path={routePaths.games}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <HomePage
                onBrandClick={handleBackToGames}
                onJoinGame={handleGoToJoinGame}
                onJoinLobby={handleGoToLobby}
                onLogout={handleLogout}
                user={authorizedUser}
              />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path={routePaths.gamesCreate}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) =>
              authorizedUser.role === 'ADMIN' ? (
                <CreateGamePage
                  onBackToGames={handleBackToGames}
                  onJoinGame={handleGoToJoinGame}
                  onOpenLobby={handleGoToLobby}
                  onLogout={handleLogout}
                  user={authorizedUser}
                />
              ) : (
                <Navigate replace to={routePaths.games} />
              )
            }
          </PrivateRoute>
        }
      />
      <Route
        path={routePaths.gamesJoin}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <JoinGamePage
                onBackToGames={handleBackToGames}
                onOpenLobby={handleGoToLobby}
                onLogout={handleLogout}
                onUserBalanceChange={handleUserBalanceChange}
                user={authorizedUser}
              />
            )}
          </PrivateRoute>
        }
      />

      {/*
        Single URL hosts the entire room experience: plate selection, boost
        phase, video, reveal, and results all happen on /games/lobby/:roomId.
       */}
      <Route
        path={routePaths.gamesLobby}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <LobbyRoute
                onBackToGames={handleBackToGames}
                onLogout={handleLogout}
                onPlayAgain={handleGoToJoinGame}
                onUserBalanceChange={handleUserBalanceChange}
                user={authorizedUser}
              />
            )}
          </PrivateRoute>
        }
      />

      <Route
        path={routePaths.admin}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) =>
              authorizedUser.role === 'ADMIN' ? (
                <AdminPage user={authorizedUser} onLogout={handleLogout} onBrandClick={handleBackToGames} />
              ) : (
                <Navigate replace to={routePaths.games} />
              )
            }
          </PrivateRoute>
        }
      />
      <Route
        path={routePaths.adminStatsTemplate}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) =>
              authorizedUser.role === 'ADMIN' ? (
                <AdminTemplateStatsDetailPage
                  user={authorizedUser}
                  onLogout={handleLogout}
                  onBrandClick={handleBackToGames}
                />
              ) : (
                <Navigate replace to={routePaths.games} />
              )
            }
          </PrivateRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

type LobbyRouteProps = {
  user: AuthUser
  onBackToGames: () => void
  onLogout: () => void
  onPlayAgain: () => void
  onUserBalanceChange: (balance: number) => void
}

function LobbyRoute({ user, onBackToGames, onLogout, onPlayAgain, onUserBalanceChange }: LobbyRouteProps) {
  const params = useParams<{ roomId: string }>()
  const roomId = Number(params.roomId)

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return <Navigate replace to={routePaths.games} />
  }

  return (
    <LobbyPage
      onBackToGames={onBackToGames}
      onLogout={onLogout}
      onPlayAgain={onPlayAgain}
      onUserBalanceChange={onUserBalanceChange}
      roomId={roomId}
      user={user}
    />
  )
}
