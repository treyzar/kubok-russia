import { type AuthUser } from '@entities/user'

export type JoinGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onCreateGame: () => void
  onOpenLobby: () => void
  onLogout: () => void
}

export type Lobby = {
  id: number
  creator: string
  players: string
  cost: string
  type: 'purple' | 'pink' | 'green'
}
