import { Route, Routes, useNavigate } from 'react-router-dom'

import { useAuthSession } from '@processes/auth-session'
import { type AuthUser } from '@entities/user'
import { AuthLandingHero, AuthLoginForm } from '@pages/auth'
import { CreateGamePage } from '@pages/create-game'
import { HomePage } from '@pages/home'
import { JoinGamePage } from '@pages/join-game'
import { LobbyPage } from '@pages/lobby'
import { NotFoundPage } from '@pages/not-found'

import { routePaths } from '../config/route-paths'
import { PrivateRoute, PublicOnlyRoute } from './route-guards'

export function AppRouter() {
  const navigate = useNavigate()
  const { user, signIn, signOut } = useAuthSession()

  function handleAuthSuccess(authUser: AuthUser): void {
    signIn(authUser)
    navigate(routePaths.games, { replace: true })
  }

  function handleLogout(): void {
    signOut()
    navigate(routePaths.root, { replace: true })
  }

  function handleGoToCreateGame(): void {
    navigate(routePaths.gamesCreate)
  }

  function handleGoToJoinGame(): void {
    navigate(routePaths.gamesJoin)
  }

  function handleBackToGames(): void {
    navigate(routePaths.games)
  }

  function handleGoToLobby(): void {
    navigate(routePaths.gamesLobby)
  }

  return (
    <Routes>
      <Route
        path={routePaths.root}
        element={
          <PublicOnlyRoute user={user}>
            <AuthLandingHero onEnterLogin={() => navigate(routePaths.auth)} />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={routePaths.auth}
        element={
          <PublicOnlyRoute user={user}>
            <AuthLoginForm onAuthSuccess={handleAuthSuccess} />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={routePaths.games}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <HomePage
                onBrandClick={handleBackToGames}
                onCreateGame={handleGoToCreateGame}
                onJoinGame={handleGoToJoinGame}
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
            {(authorizedUser) => (
              <CreateGamePage
                onBackToGames={handleBackToGames}
                onJoinGame={handleGoToJoinGame}
                onOpenLobby={handleGoToLobby}
                onLogout={handleLogout}
                user={authorizedUser}
              />
            )}
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
                onCreateGame={handleGoToCreateGame}
                onOpenLobby={handleGoToLobby}
                onLogout={handleLogout}
                user={authorizedUser}
              />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path={routePaths.gamesLobby}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <LobbyPage
                onBackToGames={handleBackToGames}
                onCreateGame={handleGoToCreateGame}
                onStartGame={handleBackToGames}
                user={authorizedUser}
              />
            )}
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
