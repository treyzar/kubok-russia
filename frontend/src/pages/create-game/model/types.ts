import { type AuthUser } from '@entities/user'

export type CreateGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onJoinGame: () => void
  onOpenLobby: () => void
  onLogout: () => void
}

export type GameBackground = 'altai' | 'space' | 'japan'
