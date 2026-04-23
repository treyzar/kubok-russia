import { type AuthUser } from '@entities/user'

export type LobbyPageProps = {
  user: AuthUser
  roomId: number
  onBackToGames: () => void
  onPlayAgain: () => void
  onLogout: () => void
  onUserBalanceChange: (balance: number) => void
}

export type GamePhase = 'lobby' | 'boost' | 'video' | 'reveal' | 'results'

export type SeatInfo = {
  seatNumber: number
  userId: number | null
  isMe: boolean
}

export type SeatVisualState = 'free' | 'mine' | 'taken'

export type RevealSeatInfo = SeatInfo & {
  isWinner: boolean
  productSrc: string
  productLabel: string
}

export type PlayerWithProbability = {
  userId: number
  places: number
  boostAmount: number
  weight: number
  probability: number
  isMe: boolean
}

export type ProductItem = {
  id: string
  src: string
  label: string
}
