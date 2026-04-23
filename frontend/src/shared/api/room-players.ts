import type { JoinRoomBody, LeaveRoomBody, PlayersResponse, Room, RoomPlayer } from '@shared/types'

import { apiRequest } from './client'

export function joinRoom(roomId: number, body: JoinRoomBody): Promise<Room> {
  return apiRequest<Room>({
    method: 'POST',
    url: `/rooms/${roomId}/players`,
    data: body,
  })
}

export function leaveRoom(roomId: number, body: LeaveRoomBody): Promise<Room> {
  return apiRequest<Room>({
    method: 'DELETE',
    url: `/rooms/${roomId}/players`,
    data: body,
  })
}

/**
 * The backend returns one row per occupied place — `{ room_id, user_id,
 * place_id, joined_at }`. The UI works with one row per *player* with a
 * `places` count (a single user may hold multiple plates), so we aggregate
 * here. The earliest `joined_at` is preserved so seat ordering remains
 * deterministic.
 */
type RawPlaceRow = {
  room_id: number
  user_id: number
  place_id?: number
  places?: number
  joined_at: string
}

export async function listRoomPlayers(roomId: number): Promise<PlayersResponse> {
  const raw = await apiRequest<{ players: RawPlaceRow[] }>({
    method: 'GET',
    url: `/rooms/${roomId}/players`,
  })

  const grouped = new Map<number, RoomPlayer>()
  for (const row of raw.players) {
    const existing = grouped.get(row.user_id)
    const inc = typeof row.places === 'number' ? row.places : 1
    if (existing) {
      existing.places += inc
      if (row.joined_at < existing.joined_at) existing.joined_at = row.joined_at
    } else {
      grouped.set(row.user_id, {
        room_id: row.room_id,
        user_id: row.user_id,
        places: inc,
        joined_at: row.joined_at,
      })
    }
  }

  return { players: Array.from(grouped.values()) }
}
