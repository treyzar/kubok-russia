import { type AuthUser } from '@entities/user'

export type LobbyPageProps = {
  user: AuthUser
  onBackToGames: () => void
  onCreateGame: () => void
  onStartGame: () => void
}

export type PlayerFace = 'smile' | 'beard'

export type SidePlayer = {
  id: string
  top: string
  right: string
  face: PlayerFace
}

export type PlayerAvatarProps = {
  face: PlayerFace
  size: string
}
