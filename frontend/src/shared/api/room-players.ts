import type { JoinRoomBody, LeaveRoomBody, PlayersResponse, Room } from '@shared/types'

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

export function listRoomPlayers(roomId: number): Promise<PlayersResponse> {
  return apiRequest<PlayersResponse>({
    method: 'GET',
    url: `/rooms/${roomId}/players`,
  })
}
