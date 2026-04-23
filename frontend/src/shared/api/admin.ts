import type { GameType } from '@shared/types'

import { apiRequest } from './client'

export type AdminTimePeriod = 'hour' | 'day' | 'week' | 'month' | 'all' | 'custom'

export type ValidateTemplatePayload = {
  players_needed: number
  min_players: number
  entry_cost: number
  winner_pct: number
  game_type?: GameType
}

export type ValidateTemplateWarning = {
  field: string
  message: string
  severity: 'warning' | 'error'
}

export type ValidateTemplateResponse = {
  valid: boolean
  warnings: ValidateTemplateWarning[]
  expected_jackpot: number
  is_duplicate: boolean
}

export function validateAdminTemplate(payload: ValidateTemplatePayload): Promise<ValidateTemplateResponse> {
  return apiRequest<ValidateTemplateResponse>({
    method: 'POST',
    url: '/admin/templates/validate',
    data: payload,
  })
}

export type HistoricalMetrics = {
  avg_real_players_per_room: number
  avg_entry_cost: number
  total_rooms: number
}

export function getHistoricalMetrics(): Promise<HistoricalMetrics> {
  return apiRequest<HistoricalMetrics>({
    method: 'GET',
    url: '/admin/metrics/historical',
  })
}

export type AdminTemplateListItem = {
  template_id: number
  name: string
  players_needed: number
  min_players: number
  max_players: number
  entry_cost: number
  winner_pct: number
  round_duration_seconds: number
  start_delay_seconds: number
  game_type: GameType
  created_at: string
  updated_at: string
  deleted_at: string | null
  completed_rooms: number
}

export type AdminTemplatesListParams = {
  period?: AdminTimePeriod
  start_time?: string
  end_time?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export function listAdminTemplates(params: AdminTemplatesListParams = {}): Promise<{ templates: AdminTemplateListItem[] }> {
  return apiRequest<{ templates: AdminTemplateListItem[] }>({
    method: 'GET',
    url: '/admin/statistics/templates',
    params,
  })
}

export type AdminTemplateStats = {
  template_id: number
  completed_rooms: number
  total_real_players: number
  total_bots: number
  avg_real_players_per_room: number
  real_player_wins: number
  bot_wins: number
  total_boost_amount: number
  avg_boost_per_player: number
  avg_boost_per_room: number
  avg_places_per_player: number
}

export function getAdminTemplateStats(
  templateId: number,
  params: { period?: AdminTimePeriod; start_time?: string; end_time?: string } = {},
): Promise<AdminTemplateStats> {
  return apiRequest<AdminTemplateStats>({
    method: 'GET',
    url: `/admin/statistics/templates/${templateId}`,
    params,
  })
}

export type AdminTemplatePayload = {
  name?: string
  min_players: number
  max_players: number
  entry_cost: number
  winner_pct: number
  game_type?: GameType
  round_duration_seconds?: number
  start_delay_seconds?: number
}

export function createAdminTemplate(payload: AdminTemplatePayload): Promise<AdminTemplateListItem> {
  return apiRequest<AdminTemplateListItem>({
    method: 'POST',
    url: '/room-templates',
    data: payload,
  })
}

export function updateAdminTemplate(templateId: number, payload: AdminTemplatePayload): Promise<AdminTemplateListItem> {
  return apiRequest<AdminTemplateListItem>({
    method: 'PUT',
    url: `/admin/templates/${templateId}`,
    data: payload,
  })
}

export function deleteAdminTemplate(templateId: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>({
    method: 'DELETE',
    url: `/admin/templates/${templateId}`,
  })
}
