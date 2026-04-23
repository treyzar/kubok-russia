import type { GameType } from './common'

export type RoomTemplate = {
  template_id: number
  name: string
  players_needed: number
  min_players: number
  entry_cost: number
  winner_pct: number
  round_duration_seconds: number
  start_delay_seconds: number
  game_type: GameType
  created_at: string
  updated_at: string
}

export type TemplateStatus = {
  template_id: number
  active_rooms: number
  waiting_rooms: number
}

export type GetTemplateRoomStatusRow = {
  active_rooms: number
  waiting_rooms: number
}

export type CreateTemplateBody = {
  name: string
  players_needed: number
  min_players?: number
  entry_cost: number
  winner_pct?: number
  round_duration_seconds?: number
  start_delay_seconds?: number
  game_type?: GameType
}

export type ValidateRoomBody = {
  players_needed: number
  entry_cost: number
  winner_pct: number
}

export type TemplatesResponse = { templates: RoomTemplate[] }
