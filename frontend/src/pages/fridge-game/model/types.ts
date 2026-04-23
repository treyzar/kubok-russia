export type GameState = 'video' | 'initial' | 'bonus_added' | 'finished'

export type Player = {
  id: number
  name: string
  amount: number
  isUser?: boolean
}
