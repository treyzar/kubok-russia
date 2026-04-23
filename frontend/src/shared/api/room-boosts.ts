import type { BoostAmountResult, BoostProbabilityResult, BoostsResponse, BuyBoostBody, RoomBoost } from '@shared/types'

import { apiRequest } from './client'

export function listRoomBoosts(roomId: number): Promise<BoostsResponse> {
  return apiRequest<BoostsResponse>({
    method: 'GET',
    url: `/rooms/${roomId}/boosts`,
  })
}

export function buyRoomBoost(roomId: number, body: BuyBoostBody): Promise<RoomBoost> {
  return apiRequest<RoomBoost>({
    method: 'POST',
    url: `/rooms/${roomId}/boosts`,
    data: body,
  })
}

export function calcRoomBoostProbability(roomId: number, userId: number, boostAmount: number): Promise<BoostProbabilityResult> {
  const params = new URLSearchParams({
    user_id: String(userId),
    boost_amount: String(boostAmount),
  })

  return apiRequest<BoostProbabilityResult>({
    method: 'GET',
    url: `/rooms/${roomId}/boosts/calc/probability?${params.toString()}`,
  })
}

export function calcRoomBoostAmount(roomId: number, userId: number, desiredProbability: number): Promise<BoostAmountResult> {
  const params = new URLSearchParams({
    user_id: String(userId),
    desired_probability: String(desiredProbability),
  })

  return apiRequest<BoostAmountResult>({
    method: 'GET',
    url: `/rooms/${roomId}/boosts/calc/boost?${params.toString()}`,
  })
}
