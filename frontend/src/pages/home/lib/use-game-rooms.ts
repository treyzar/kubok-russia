import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listRooms } from '@shared/api'
import type { Room } from '@shared/types'

export type RoomsSortKey = 'jackpot_desc' | 'entry_asc' | 'players_asc'

type UseGameRoomsOptions = {
  maxEntryCost?: number
  minPlayers?: number
  sort?: RoomsSortKey
}

export function useGameRooms({ maxEntryCost, minPlayers, sort = 'jackpot_desc' }: UseGameRoomsOptions = {}) {
  const query = useQuery({
    queryKey: ['rooms', 'new'],
    queryFn: () => listRooms({ status: 'new' }),
    refetchInterval: 5000,
  })

  const rooms = useMemo<Room[]>(() => {
    const list = query.data?.rooms ?? []
    const filtered = list.filter((room) => {
      if (typeof maxEntryCost === 'number' && room.entry_cost > maxEntryCost) return false
      if (typeof minPlayers === 'number' && room.players_needed < minPlayers) return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'entry_asc':
          return a.entry_cost - b.entry_cost
        case 'players_asc':
          return a.players_needed - b.players_needed
        case 'jackpot_desc':
        default:
          return b.jackpot - a.jackpot
      }
    })
    return sorted
  }, [query.data, maxEntryCost, minPlayers, sort])

  return {
    rooms,
    totalCount: query.data?.rooms?.length ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
