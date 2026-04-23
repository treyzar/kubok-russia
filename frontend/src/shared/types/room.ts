import type { RoomStatus, GameType } from './common'

export type Room = {
  room_id: number
  jackpot: number
  start_time: string | null
  status: RoomStatus
  players_needed: number
  min_players: number
  entry_cost: number
  winner_pct: number
  round_duration_seconds: number
  start_delay_seconds: number
  game_type: GameType
  template_id: number | null
  created_at: string
  updated_at: string
}

export type RoomPlayer = {
  room_id: number
  user_id: number
  places: number
  joined_at: string
}

export type RoomBoost = {
  room_id: number
  user_id: number
  amount: number
  boosted_at: string
}

export type RoomWinner = {
  room_id: number
  user_id: number
  prize: number
  won_at: string
}

export type RoomPlace = {
  room_id: number
  user_id: number
  place_index: number
  created_at: string
}

export type ListRoomPlayersRow = {
  room_id: number
  user_id: number
  joined_at: string
  places: number
}

export type PlayerWithStakes = {
  user_id: number
  places: number
  stake: number
  boost_amount: number
  total_stake: number
}

export type FinishRoomAndAwardWinnerRow = {
  room_id: number
  user_id: number
  prize: number
  won_at: string
}

export type InsertRoomWinRow = {
  room_id: number
  user_id: number
  prize: number
  won_at: string
}

export type LeaveRoomRow = {
  room_id: number
  user_id: number
  joined_at: string
}

export type RoomValidationResult = {
  prize_fund: number
  organiser_cut: number
  player_roi: number
  player_win_probability: number
  warnings: string[]
}

export type BoostProbabilityResult = {
  probability: number
}

export type BoostAmountResult = {
  boost_amount: number
}

export type RoomsFilterParams = {
  status?: RoomStatus
  entry_cost?: number
  players_needed?: number
  sort_by?: 'entry_cost' | 'jackpot' | 'players_needed'
  sort_order?: 'asc' | 'desc'
}

export type CreateRoomBody = {
  template_id?: number
  jackpot?: number
  start_time?: string
  status?: RoomStatus
  players_needed: number
  min_players?: number
  entry_cost: number
  winner_pct?: number
  round_duration_seconds?: number
  start_delay_seconds?: number
  game_type?: GameType
}

export type JoinRoomBody = {
  user_id: number
  places?: number
}

export type LeaveRoomBody = {
  user_id: number
}

export type BuyBoostBody = {
  user_id: number
  amount: number
}

export type RoomsResponse = { rooms: Room[] }
export type PlayersResponse = { players: RoomPlayer[] }
export type BoostsResponse = { boosts: RoomBoost[] }
export type WinnersResponse = { winners: RoomWinner[] }
