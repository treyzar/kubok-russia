import { type AuthUser } from '@entities/user'

export type HomePageProps = {
  user: AuthUser
  onLogout: () => void
  onCreateGame: () => void
  onJoinGame: () => void
  onBrandClick: () => void
  onJoinLobby: (roomId: number) => void
}

export type LastGameItem = {
  id: string
  title: string
  amount: string
  amountColor: string
  image: string
  bg: string
}

export type NewsSlideItem = {
  id: string
  image: string
  alt: string
}
