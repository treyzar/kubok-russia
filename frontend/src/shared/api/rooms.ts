import type { CreateRoomBody, Room, RoomValidationResult, RoomsFilterParams, RoomsResponse } from '@shared/types'

import { apiRequest } from './client'

function toQueryParams(filters: RoomsFilterParams): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (typeof filters.entry_cost === 'number') params.set('entry_cost', String(filters.entry_cost))
  if (typeof filters.players_needed === 'number') params.set('players_needed', String(filters.players_needed))
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)

  return params
}

export function listRooms(filters: RoomsFilterParams = {}): Promise<RoomsResponse> {
  const params = toQueryParams(filters)
  const query = params.toString()

  return apiRequest<RoomsResponse>({
    method: 'GET',
    url: query ? `/rooms?${query}` : '/rooms',
  })
}

export function getRoom(roomId: number): Promise<Room> {
  return apiRequest<Room>({
    method: 'GET',
    url: `/rooms/${roomId}`,
  })
}

export function createRoom(body: CreateRoomBody): Promise<Room> {
  return apiRequest<Room>({
    method: 'POST',
    url: '/rooms',
    data: body,
  })
}

export function validateRoom(body: Pick<CreateRoomBody, 'players_needed' | 'entry_cost' | 'winner_pct'>): Promise<RoomValidationResult> {
  return apiRequest<RoomValidationResult>({
    method: 'POST',
    url: '/rooms/validate',
    data: body,
  })
}
