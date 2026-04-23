export type RoundPhase = 'waiting' | 'filling' | 'countdown' | 'playing' | 'finished'

export type RoomConfig = {
  seatsTotal: number
  entryCost: number
  prizeFundPercent: number
  boostPrice: number
}

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

export type RoundHistoryItem = {
  id: string
  roomId: string
  participantsTotal: number
  botsTotal: number
  jackpot: number
  winnerName: string
  prize: number
  usedBoost: boolean
  startedAt: string
  finishedAt: string
  winnerReason: string
  balanceDelta: number
}

export type RoomActions = {
  joinRoom: () => void
  buyBoost: () => void
  repeatRound: () => void
  leaveRoom: () => void
  refreshRoom: () => void
  selectParticipant: (participantId: string) => void
}
