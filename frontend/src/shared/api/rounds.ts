import type { Round, RoundDetails, RoundsResponse } from '@shared/types'

import { apiRequest } from './client'

export function listRounds(): Promise<RoundsResponse> {
  return apiRequest<RoundsResponse>({
    method: 'GET',
    url: '/rounds',
  })
}

export function getRound(roomId: number): Promise<Round> {
  return apiRequest<Round>({
    method: 'GET',
    url: `/rounds/${roomId}`,
  })
}

export function getRoundDetails(roomId: number): Promise<RoundDetails> {
  return apiRequest<RoundDetails>({
    method: 'GET',
    url: `/rounds/${roomId}/details`,
  })
}
