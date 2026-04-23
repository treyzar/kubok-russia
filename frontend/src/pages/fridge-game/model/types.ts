export type GamePhase = 'boost' | 'video' | 'reveal' | 'results'

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
