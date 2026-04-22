import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { useAuthSession } from '@processes/auth-session'
import { type AuthUser } from '@entities/user'
import { AuthLandingHero, AuthLoginForm } from '@pages/auth'
import { CreateGamePage } from '@pages/create-game'
import { HomePage } from '@pages/home'
import { JoinGamePage } from '@pages/join-game'
import { LobbyPage } from '@pages/lobby'
import { NotFoundPage } from '@pages/not-found'

import { routePaths } from '../config/route-paths'
import FridgeGamePage from '@/pages/fridge-game/ui/fridge-game-page'

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
      <Route path={routePaths.root} element={<AuthLandingHero onEnterLogin={() => navigate(routePaths.auth)} />} />
      <Route
        path={routePaths.auth}
        element={user ? <Navigate replace to={routePaths.games} /> : <AuthLoginForm onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path={routePaths.games}
        element={
          user ? (
            <HomePage onCreateGame={handleGoToCreateGame} onJoinGame={handleGoToJoinGame} onLogout={handleLogout} user={user} />
          ) : (
            <Navigate replace to={routePaths.auth} />
          )
        }
      />
      <Route
        path={routePaths.gamesCreate}
        element={
          user ? (
            <CreateGamePage
              onBackToGames={handleBackToGames}
              onJoinGame={handleGoToJoinGame}
              onOpenLobby={handleGoToLobby}
              onLogout={handleLogout}
              user={user}
            />
          ) : (
            <Navigate replace to={routePaths.auth} />
          )
        }
      />
      <Route
        path={routePaths.gamesJoin}
        element={
          user ? (
            <JoinGamePage
              onBackToGames={handleBackToGames}
              onCreateGame={handleGoToCreateGame}
              onOpenLobby={handleGoToLobby}
              onLogout={handleLogout}
              user={user}
            />
          ) : (
            <Navigate replace to={routePaths.auth} />
          )
        }
      />
      <Route
        path={routePaths.gamesLobby}
        element={
          user ? (
            <LobbyPage onBackToGames={handleBackToGames} onCreateGame={handleGoToCreateGame} onStartGame={handleBackToGames} />
          ) : (
            <Navigate replace to={routePaths.auth} />
          )
        }
      />
      <Route
        path={routePaths.fridgeGame}
        element={
          user ? (
            <FridgeGamePage />
          ) : (
            <Navigate replace to={routePaths.auth} />
          )
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
