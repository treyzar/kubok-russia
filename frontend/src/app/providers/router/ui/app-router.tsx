import { useState } from 'react'
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
import { FridgeGamePage } from '@pages/fridge-game/ui/fridge-game-page'

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

      {/* Lobby + embedded game — same URL, no separate /fridge-game route */}
      <Route
        path={routePaths.gamesLobby}
        element={
          <PrivateRoute user={user}>
            {(authorizedUser) => (
              <LobbyWithGame
                onBackToGames={handleBackToGames}
                onLogout={handleLogout}
                onGoToJoin={handleGoToJoinGame}
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

type LobbyWithGameProps = {
  user: AuthUser
  onBackToGames: () => void
  onLogout: () => void
  onGoToJoin: () => void
  onUserBalanceChange: (balance: number) => void
}

/**
 * Manages the lobby → game transition on a SINGLE URL (/games/lobby/:roomId).
 * When the room moves to "playing", LobbyPage calls onStartGame() which
 * switches the rendered component to FridgeGamePage — no URL change.
 * If the user navigates away and returns, LobbyPage mounts again, detects
 * the room is already playing, and calls onStartGame() automatically.
 */
function LobbyWithGame({ user, onBackToGames, onLogout, onGoToJoin, onUserBalanceChange }: LobbyWithGameProps) {
  const params = useParams<{ roomId: string }>()
  const roomId = Number(params.roomId)
  const [gameStarted, setGameStarted] = useState(false)

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return <Navigate replace to={routePaths.games} />
  }

  if (gameStarted) {
    return (
      <FridgeGamePage
        roomId={roomId}
        userId={user.id}
        userName={user.name}
        userBalance={user.balance}
        onUserBalanceChange={onUserBalanceChange}
        onBackToGames={onBackToGames}
        onPlayAgain={() => {
          setGameStarted(false)
          onGoToJoin()
        }}
      />
    )
  }

  return (
    <LobbyPage
      onBackToGames={onBackToGames}
      onLogout={onLogout}
      onPlayAgain={onGoToJoin}
      onStartGame={() => setGameStarted(true)}
      onUserBalanceChange={onUserBalanceChange}
      roomId={roomId}
      user={user}
    />
  )
}
