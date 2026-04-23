import type { RoomStatus } from './common'

export type RoundPlayer = {
  user_id: number
  joined_at: string
}

export type RoundPlayerDetailed = {
  user_id: number
  places: number
  joined_at: string
}

export type RoundBoost = {
  user_id: number
  amount: number
}

export type RoundBoostDetailed = {
  user_id: number
  amount: number
  boosted_at: string
}

export type RoundWinner = {
  user_id: number
  prize: number
  won_at: string
}

export type Round = {
  room_id: number
  jackpot: number
  entry_cost: number
  players_needed: number
  winner_pct: number
  start_time: string
  players: RoundPlayer[]
  boosts: RoundBoost[]
  winner: RoundWinner
}

export type RoundDetails = {
  room_id: number
  jackpot: number
  entry_cost: number
  winner_pct: number
  players_needed: number
  status: RoomStatus
  created_at: string
  start_time: string
  players: RoundPlayerDetailed[]
  boosts: RoundBoostDetailed[]
  winner: RoundWinner
}

export type GetRoundPlayersRow = {
  room_id: number
  user_id: number
  places: number
  joined_at: string
}

export type GetRoundDetailsRow = {
  room_id: number
  jackpot: number
  entry_cost: number
  winner_pct: number
  players_needed: number
  status: RoomStatus
  created_at: string
  start_time: string | null
  players: RoundPlayerDetailed[]
  boosts: RoundBoostDetailed[]
  winner: RoundWinner | null
}

export type RoundsResponse = { rounds: Round[] }
