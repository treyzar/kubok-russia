import { type AuthUser } from '@entities/user'

export type JoinGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onCreateGame: () => void
  onOpenLobby: (roomId: number) => void
  onLogout: () => void
  onUserBalanceChange: (balance: number) => void
}

export type Lobby = {
  id: number
  creator: string
  players: string
  cost: string
  type: 'purple' | 'pink' | 'green'
}
