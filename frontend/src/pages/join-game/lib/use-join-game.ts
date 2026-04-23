import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { resolveApiUserId } from '@processes/auth-session'
import { ApiClientError, getUser, joinRoom, listRooms } from '@shared/api'
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

export function useJoinGame({ userId, userName, userBalance, onUserBalanceChange }: UseJoinGameOptions) {
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

  const joinRoomMutation = useMutation({
    mutationFn: async ({ roomId, apiUserId }: { roomId: number; apiUserId: number }) => {
      return joinRoom(roomId, {
        user_id: apiUserId,
        places: 1,
      })
    },
  })

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

  async function handleJoinLobby(lobbyId: number, onSuccess: (roomId: number) => void): Promise<void> {
    try {
      setJoinError('')
      const apiUserId = await resolveApiUserId(userId, userName, userBalance)
      const room = await joinRoomMutation.mutateAsync({ roomId: lobbyId, apiUserId })
      await refreshUserBalance(apiUserId, onUserBalanceChange)
      onSuccess(room.room_id)
    } catch (error: unknown) {
      setJoinError(mapJoinError(error))
    }
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
    isJoining: joinRoomMutation.isPending,
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

function mapJoinError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'Не удалось войти в комнату. Проверьте соединение и попробуйте ещё раз.'
  }

  if (error.status === 402) {
    const details = error.details as {
      errors?: {
        required?: number
        current_balance?: number
        shortfall?: number
      }
      detail?: string
    }

    const required = details.errors?.required
    const currentBalance = details.errors?.current_balance
    const shortfall = details.errors?.shortfall
    if (typeof required === 'number' && typeof currentBalance === 'number' && typeof shortfall === 'number') {
      return `Недостаточно баллов. Нужно: ${required.toLocaleString('ru-RU')}, доступно: ${currentBalance.toLocaleString('ru-RU')}, не хватает: ${shortfall.toLocaleString('ru-RU')}.`
    }
    return details.detail ?? 'Недостаточно баллов для входа в комнату.'
  }

  if (error.status === 409) {
    const details = error.details as { detail?: string }
    if (details.detail === 'room is full') {
      return 'Комната уже заполнена. Обновите список и выберите другую.'
    }
    if (details.detail === 'user already in room') {
      return 'Вы уже участвуете в этой комнате.'
    }
    return details.detail ?? 'Конфликт при входе в комнату. Попробуйте снова.'
  }

  return error.message || 'Не удалось войти в комнату. Попробуйте снова.'
}

function consumeJoinPrefillAffordable(): boolean {
  const shouldPrefillAffordable = window.localStorage.getItem(JOIN_PREFILL_AFFORDABLE_KEY) === '1'
  if (shouldPrefillAffordable) {
    window.localStorage.removeItem(JOIN_PREFILL_AFFORDABLE_KEY)
  }
  return shouldPrefillAffordable
}

async function refreshUserBalance(apiUserId: number, onUserBalanceChange: (balance: number) => void): Promise<void> {
  try {
    const apiUser = await getUser(apiUserId)
    onUserBalanceChange(apiUser.balance)
  } catch {
    // Do not fail the happy-path action if balance refresh is temporarily unavailable.
  }
}
