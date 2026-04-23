import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  ApiClientError,
  connectRoomWS,
  getRoom,
  getUser,
  joinRoom,
  leaveRoom,
  listRoomBoosts,
  listRoomPlayers,
} from '@shared/api'
import { resolveApiUserId } from '@processes/auth-session'
import type { Room, RoomPlayer } from '@shared/types'
import type { SeatInfo } from '../model/types'

type UseLobbyOptions = {
  roomId: number
  onStartGame: () => void
  onUserBalanceChange: (balance: number) => void
  userId: string
  userName: string
  userBalance: number
}

export function useLobby({ roomId, onStartGame, onUserBalanceChange, userId, userName, userBalance }: UseLobbyOptions) {
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [apiUserId, setApiUserId] = useState<number | null>(null)
  const [placesToBuy, setPlacesToBuy] = useState(1)
  const [isBuyingSeats, setIsBuyingSeats] = useState(false)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [hasPurchasedSeats, setHasPurchasedSeats] = useState(false)
  const [seatError, setSeatError] = useState('')
  const [leaveError, setLeaveError] = useState('')
  const hasNavigatedRef = useRef(false)
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => getRoom(roomId),
    staleTime: 0,
  })

  const playersQuery = useQuery({
    queryKey: ['room-players', roomId],
    queryFn: async () => listRoomPlayers(roomId),
    refetchInterval: 2000,
  })

  const boostsQuery = useQuery({
    queryKey: ['room-boosts', roomId],
    queryFn: async () => listRoomBoosts(roomId),
    refetchInterval: 3000,
  })

  useEffect(() => {
    let cancelled = false
    void resolveApiUserId(userId, userName, userBalance)
      .then((id) => { if (!cancelled) setApiUserId(id) })
      .catch(() => { if (!cancelled) setApiUserId(null) })
    return () => { cancelled = true }
  }, [userId, userName, userBalance])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => {
      setLiveRoom(snapshot)
      queryClient.setQueryData(['room', roomId], snapshot)
    })
  }, [queryClient, roomId])

  const room = liveRoom ?? roomQuery.data ?? null
  const roomStatus = room?.status ?? 'new'
  const players: RoomPlayer[] = playersQuery.data?.players ?? []
  const boostsCount = boostsQuery.data?.boosts.length ?? 0

  const hasJoined = useMemo(() => {
    if (hasPurchasedSeats) return true
    if (apiUserId === null) return false
    return players.some((p) => p.user_id === apiUserId)
  }, [hasPurchasedSeats, apiUserId, players])

  const myPlaces = useMemo(() => {
    if (apiUserId === null) return 0
    return players.find((p) => p.user_id === apiUserId)?.places ?? 0
  }, [apiUserId, players])

  useEffect(() => {
    if ((roomStatus === 'playing' || roomStatus === 'finished') && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      onStartGame()
    }
  }, [roomStatus, onStartGame])

  const occupiedSeats = players.reduce((sum, p) => sum + p.places, 0)
  const totalSeats = room?.players_needed ?? 0
  const freeSeats = Math.max(0, totalSeats - occupiedSeats)
  const maxPlacesToBuy = Math.min(freeSeats, 5)

  const seats: SeatInfo[] = useMemo(() => {
    if (totalSeats === 0) return []
    const result: SeatInfo[] = []
    let seatIndex = 1
    const sorted = [...players].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    for (const player of sorted) {
      for (let i = 0; i < player.places; i++) {
        result.push({ seatNumber: seatIndex++, userId: player.user_id, isMe: player.user_id === apiUserId })
      }
    }
    while (seatIndex <= totalSeats) {
      result.push({ seatNumber: seatIndex++, userId: null, isMe: false })
    }
    return result
  }, [players, apiUserId, totalSeats])

  const countdownLabel = useMemo(() => {
    if (!room?.start_time) return null
    const startAt = new Date(room.start_time).getTime()
    const diffSeconds = Math.max(0, Math.floor((startAt - nowTick) / 1000))
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [nowTick, room?.start_time])

  async function handleBuySeats(): Promise<void> {
    if (isBuyingSeats || hasJoined) return
    setSeatError('')
    setIsBuyingSeats(true)
    try {
      const resolvedId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      await joinRoom(roomId, { user_id: resolvedId, places: placesToBuy })
      setHasPurchasedSeats(true)
      try {
        const apiUser = await getUser(resolvedId)
        onUserBalanceChange(apiUser.balance)
      } catch { }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['room-players', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['room', roomId] }),
      ])
    } catch (error: unknown) {
      setSeatError(mapSeatError(error))
    } finally {
      setIsBuyingSeats(false)
    }
  }

  async function handleLeaveRoomAndExit(onExit: () => void): Promise<void> {
    setIsLeavingRoom(true)
    setLeaveError('')
    try {
      if (hasJoined) {
        const resolvedId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
        try {
          await leaveRoom(roomId, { user_id: resolvedId })
          const apiUser = await getUser(resolvedId)
          onUserBalanceChange(apiUser.balance)
        } catch {
          // Best-effort: don't block navigation on leave error
        }
      }
    } finally {
      setIsLeavingRoom(false)
      onExit()
    }
  }

  const lobbyError = useMemo(() => {
    if (leaveError) return leaveError
    const firstError = roomQuery.error ?? playersQuery.error
    if (!firstError) return ''
    if (firstError instanceof ApiClientError) return firstError.message || 'Ошибка загрузки лобби.'
    if (firstError instanceof Error) return firstError.message
    return 'Не удалось обновить данные лобби.'
  }, [leaveError, roomQuery.error, playersQuery.error])

  return {
    room,
    roomStatus,
    seats,
    players,
    boostsCount,
    hasJoined,
    myPlaces,
    hasPurchasedSeats,
    isLoadingLobby: roomQuery.isLoading,
    lobbyError,
    isLeavingRoom,
    countdownLabel,
    handleBuySeats,
    handleLeaveRoomAndExit,
    isBuyingSeats,
    seatError,
    placesToBuy,
    setPlacesToBuy,
    maxPlacesToBuy,
    freeSeats,
    totalSeats,
    apiUserId,
  }
}

async function getOrResolveApiUserId(current: number | null, userId: string, userName: string, userBalance: number): Promise<number> {
  if (current !== null) return current
  return resolveApiUserId(userId, userName, userBalance)
}

function mapSeatError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 402) return 'Недостаточно баллов для покупки.'
    if (error.status === 409) return 'Вы уже занимаете места в этой комнате.'
    return error.message || 'Не удалось занять места.'
  }
  if (error instanceof Error) return error.message
  return 'Не удалось занять места.'
}
