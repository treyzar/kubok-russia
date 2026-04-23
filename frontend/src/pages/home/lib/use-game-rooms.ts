import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listRooms } from '@shared/api'
import type { Room } from '@shared/types'

export type RoomsSortKey = 'jackpot_desc' | 'entry_asc' | 'players_asc'

/** Statuses considered "joinable / live" for the discovery grid. */
const ACTIVE_STATUSES: ReadonlyArray<Room['status']> = ['new', 'starting_soon', 'playing']

type UseGameRoomsOptions = {
  maxEntryCost?: number
  minPlayers?: number
  sort?: RoomsSortKey
}

export type DiscoverableRoom = Room & {
  /** Best-effort current player count derived from jackpot / entry_cost. */
  current_players: number
}

export function useGameRooms({ maxEntryCost, minPlayers, sort = 'jackpot_desc' }: UseGameRoomsOptions = {}) {
  const query = useQuery({
    queryKey: ['rooms', 'discover'],
    // Fetch every status the user can interact with — not just `new` —
    // so the discovery grid can also show rooms that are filling up or
    // already in progress.
    queryFn: () => listRooms({}),
    refetchInterval: 5000,
  })

  const rooms = useMemo<DiscoverableRoom[]>(() => {
    const list = query.data?.rooms ?? []
    const active: DiscoverableRoom[] = list
      .filter((room) => ACTIVE_STATUSES.includes(room.status))
      .map((room) => ({
        ...room,
        current_players:
          room.entry_cost > 0 ? Math.max(0, Math.round(room.jackpot / room.entry_cost)) : 0,
      }))
    const filtered = active.filter((room) => {
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
    totalCount: rooms.length,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
