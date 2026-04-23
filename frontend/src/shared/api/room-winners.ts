import type { WinnersResponse } from '@shared/types'

import { apiRequest } from './client'

export function listRoomWinners(roomId: number): Promise<WinnersResponse> {
  return apiRequest<WinnersResponse>({
    method: 'GET',
    url: `/rooms/${roomId}/winners`,
  })
}

