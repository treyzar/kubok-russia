import type { FairRiskLevel, FairRoomState } from './common'

export type FairRoomView = {
  id: string
  risk_level: FairRiskLevel
  state: FairRoomState
  seed_hash: string
  seed_reveal?: string // присутствует только когда state === 'finished'
  created_at: string
}

export type FairPlayer = {
  id: string
  room_id: string
  user_id: string
  initial_deposit: number
  refund_amount: number
  refunded: boolean
}

export type FairJoinResult = {
  player: FairPlayer
  room: FairRoomView
  scaled_deposit: number
}

export type FairRoomsResponse = { rooms: FairRoomView[] }
