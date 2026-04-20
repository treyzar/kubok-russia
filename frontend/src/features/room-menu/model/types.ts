export type RoundPhase = 'waiting' | 'filling' | 'countdown' | 'playing' | 'finished'

export type RoomState = {
  id: string
  title: string
  entryCost: number
  seatsTotal: number
  seatsTaken: number
  jackpot: number
  phase: RoundPhase
  countdownSeconds: number
  playingSeconds: number
  winnerId: string | null
}

export type ParticipantOdds = {
  id: string
  name: string
  isBot: boolean
  seat: number
  boostPoints: number
  finalChance: number
  isCurrentUser: boolean
}

export type BoostState = {
  price: number
  chanceBonusPercent: number
  purchasedByCurrentUser: boolean
  disabledReason: string | null
}

export type RoundTimelineEvent = {
  id: string
  text: string
  at: string
}

export type RoomActions = {
  joinRoom: () => void
  buyBoost: () => void
  repeatRound: () => void
  leaveRoom: () => void
  refreshRoom: () => void
  selectParticipant: (participantId: string) => void
}
