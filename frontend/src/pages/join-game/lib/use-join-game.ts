import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApiClientError, listRooms } from '@shared/api'
import type { Room } from '@shared/types'

import { LOBBIES } from '../model/constants'
import { matchesPriceFilter, matchesSeatsFilter, parseLobbyCost, parseLobbySeats, sortLobbies } from '../model/lib'
import type { Lobby } from '../model/types'
import type { LobbyPriceFilter, LobbySeatsFilter, LobbySort } from '../model/lib'

type UseJoinGameOptions = {
  userId: string
  userName: string
  userBalance: number
  onUserBalanceChange: (balance: number) => void
}

const JOIN_PREFILL_AFFORDABLE_KEY = 'kubok26.join.prefill.affordable'

export function useJoinGame({ userBalance }: UseJoinGameOptions) {
  const [prefillAffordable] = useState<boolean>(() => consumeJoinPrefillAffordable())
  const [isAffordablePrefillBannerVisible, setIsAffordablePrefillBannerVisible] = useState(prefillAffordable)
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState<LobbyPriceFilter>(() => (prefillAffordable ? 'cheap' : 'any'))
  const [seatsFilter, setSeatsFilter] = useState<LobbySeatsFilter>('any')
  const [sortBy, setSortBy] = useState<LobbySort>(() => (prefillAffordable ? 'price-asc' : 'recommended'))
  const [onlyAffordable, setOnlyAffordable] = useState(prefillAffordable)
  const [joinError, setJoinError] = useState('')

  const roomsQuery = useQuery({
    queryKey: ['rooms', 'join-game'],
    queryFn: async () => {
      const response = await listRooms({ status: 'new' })
      return response.rooms
    },
    refetchInterval: 5000,
  })

  const apiLobbies = useMemo(() => roomsQuery.data?.map(mapRoomToLobby) ?? null, [roomsQuery.data])
  const sourceLobbies = apiLobbies ?? LOBBIES

  const loadError = useMemo(() => {
    if (!roomsQuery.error) {
      return ''
    }

    if (roomsQuery.error instanceof ApiClientError) {
      const statusSuffix = roomsQuery.error.status ? ` (HTTP ${roomsQuery.error.status})` : ''
      return `Не удалось загрузить комнаты из API${statusSuffix}. Показаны демо-данные.`
    }

    return 'Не удалось загрузить комнаты из API. Показаны демо-данные.'
  }, [roomsQuery.error])

  const matchedLobbies = useMemo(() => {
    const filtered = sourceLobbies.filter((lobby) => {
      const cost = parseLobbyCost(lobby.cost)
      const seats = parseLobbySeats(lobby.players)

      if (
        searchTerm.trim() &&
        !lobby.creator.toLowerCase().includes(searchTerm.trim().toLowerCase()) &&
        !`${lobby.id}`.includes(searchTerm.trim())
      ) {
        return false
      }
      if (!matchesPriceFilter(cost, priceFilter)) return false
      if (!matchesSeatsFilter(seats, seatsFilter)) return false
      if (onlyAffordable && cost > userBalance) return false
      return true
    })

    return sortLobbies(filtered, sortBy)
  }, [onlyAffordable, priceFilter, searchTerm, seatsFilter, sortBy, sourceLobbies, userBalance])

  const bestMatch = matchedLobbies[0] ?? null

  function cyclePriceFilter(): void {
    setPriceFilter((v) => (v === 'any' ? 'cheap' : v === 'cheap' ? 'medium' : v === 'medium' ? 'high' : 'any'))
  }

  function cycleSeatsFilter(): void {
    setSeatsFilter((v) => (v === 'any' ? 'small' : v === 'small' ? 'mid' : v === 'mid' ? 'large' : 'any'))
  }

  function cycleSortBy(): void {
    setSortBy((v) =>
      v === 'recommended' ? 'price-asc' : v === 'price-asc' ? 'price-desc' : v === 'price-desc' ? 'seats-asc' : 'recommended',
    )
  }

  function handlePickAffordable(): void {
    setOnlyAffordable(true)
    setPriceFilter('cheap')
    setSortBy('price-asc')
    setJoinError('')
    setIsAffordablePrefillBannerVisible(false)
  }

  function hideAffordablePrefillBanner(): void {
    setIsAffordablePrefillBannerVisible(false)
  }

  function handleJoinLobby(lobbyId: number, onSuccess: (roomId: number) => void): void {
    setJoinError('')
    onSuccess(lobbyId)
  }

  const priceFilterLabel: Record<LobbyPriceFilter, string> = {
    any: 'Любая',
    cheap: 'До 1 000',
    medium: '1 001 — 15 000',
    high: 'Выше 15 000',
  }

  const seatsFilterLabel: Record<LobbySeatsFilter, string> = {
    any: 'Любое число',
    small: 'До 3 игроков',
    mid: '4-6 игроков',
    large: 'От 7 игроков',
  }

  const sortByLabel: Record<LobbySort, string> = {
    recommended: 'рекомендовано',
    'price-asc': 'дешевле',
    'price-desc': 'дороже',
    'seats-asc': 'по местам',
  }

  return {
    searchTerm,
    setSearchTerm,
    priceFilter,
    cyclePriceFilter,
    priceFilterLabel: priceFilterLabel[priceFilter],
    seatsFilter,
    cycleSeatsFilter,
    seatsFilterLabel: seatsFilterLabel[seatsFilter],
    sortBy,
    cycleSortBy,
    sortByLabel: sortByLabel[sortBy],
    onlyAffordable,
    setOnlyAffordable,
    matchedLobbies,
    bestMatch,
    isLoading: roomsQuery.isLoading,
    loadError,
    isAffordablePrefillBannerVisible,
    isJoining: false,
    joinError,
    handlePickAffordable,
    hideAffordablePrefillBanner,
    handleJoinLobby,
  }
}

function mapRoomToLobby(room: Room): Lobby {
  const safeEntryCost = Math.max(0, room.entry_cost)
  const filledSeats =
    safeEntryCost > 0 && room.jackpot > 0 ? Math.min(room.players_needed, Math.floor(room.jackpot / safeEntryCost)) : 0

  return {
    id: room.room_id,
    creator: `Комната #${room.room_id}`,
    players: `${filledSeats} / ${room.players_needed}`,
    cost: safeEntryCost.toLocaleString('ru-RU'),
    type: pickLobbyType(safeEntryCost),
  }
}

function pickLobbyType(entryCost: number): Lobby['type'] {
  if (entryCost > 15000) {
    return 'green'
  }
  if (entryCost > 1000) {
    return 'pink'
  }
  return 'purple'
}

function consumeJoinPrefillAffordable(): boolean {
  const shouldPrefillAffordable = window.localStorage.getItem(JOIN_PREFILL_AFFORDABLE_KEY) === '1'
  if (shouldPrefillAffordable) {
    window.localStorage.removeItem(JOIN_PREFILL_AFFORDABLE_KEY)
  }
  return shouldPrefillAffordable
}
