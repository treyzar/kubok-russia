import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'

import { useAuthSession } from '@processes/auth-session'
import { type AuthUser } from '@entities/user'
import { AuthLoginForm } from '@pages/auth'
import { AdminPage, AdminTemplateStatsDetailPage } from '@pages/admin'
import { CreateGamePage } from '@pages/create-game'
import { HomePage } from '@pages/home'
import { JoinGamePage } from '@pages/join-game'
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
    // Lobby is hosted inline on /games via the ?room=<id> search param.
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
                onUserBalanceChange={handleUserBalanceChange}
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
        The lobby is now embedded inline on /games via the ?room=<id> search
        param so no URL change happens when entering a room. The legacy
        /games/lobby/:roomId URL is kept for backwards compatibility and
        simply redirects to /games?room=<id>.
       */}
      <Route path={routePaths.gamesLobby} element={<LobbyLegacyRedirect />} />

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

function LobbyLegacyRedirect() {
  const params = useParams<{ roomId: string }>()
  const roomId = Number(params.roomId)
  const target =
    Number.isInteger(roomId) && roomId > 0
      ? gamesLobbyPath(roomId)
      : routePaths.games
  return <Navigate replace to={target} />
}
