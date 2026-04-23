import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  ApiClientError,
  buyRoomBoost,
  calcRoomBoostAmount,
  calcRoomBoostProbability,
  connectRoomWS,
  getRoom,
  getUser,
  joinRoom,
  leaveRoom,
  listRoomBoosts,
  listRoomPlayers,
  listRoomWinners,
} from '@shared/api'
import { resolveApiUserId } from '@processes/auth-session'
import type { Room, RoomPlayer, RoomWinner } from '@shared/types'
import type { SeatInfo } from '../model/types'

const BOOST_CALC_DEBOUNCE_MS = 300

type UseLobbyOptions = {
  roomId: number
  onStartGame: (roomId: number) => void
  onUserBalanceChange: (balance: number) => void
  userId: string
  userName: string
  userBalance: number
}

type InsufficientFundsState = {
  message: string
  required: number
  currentBalance: number
  shortfall: number
}

export function useLobby({ roomId, onStartGame, onUserBalanceChange, userId, userName, userBalance }: UseLobbyOptions) {
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [leaveError, setLeaveError] = useState('')
  const [boostAmount, setBoostAmount] = useState('100')
  const [desiredProbability, setDesiredProbability] = useState('20')
  const [boostError, setBoostError] = useState('')
  const [insufficientFunds, setInsufficientFunds] = useState<InsufficientFundsState | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [apiUserId, setApiUserId] = useState<number | null>(null)
  const [debouncedBoostAmount, setDebouncedBoostAmount] = useState(boostAmount)
  const [debouncedDesiredProbability, setDebouncedDesiredProbability] = useState(desiredProbability)
  const [placesToBuy, setPlacesToBuy] = useState(1)
  const [isBuyingSeats, setIsBuyingSeats] = useState(false)
  const [seatError, setSeatError] = useState('')
  const [hasPurchasedSeats, setHasPurchasedSeats] = useState(false)
  const hasNavigatedRef = useRef(false)
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => getRoom(roomId),
  })

  const playersQuery = useQuery({
    queryKey: ['room-players', roomId],
    queryFn: async () => listRoomPlayers(roomId),
    refetchInterval: 3000,
  })

  const boostsQuery = useQuery({
    queryKey: ['room-boosts', roomId],
    queryFn: async () => listRoomBoosts(roomId),
  })

  const winnersQuery = useQuery({
    queryKey: ['room-winners', roomId],
    queryFn: async () => listRoomWinners(roomId),
  })

  const parsedBoostAmount = Number(debouncedBoostAmount)
  const parsedDesiredProbability = Number(debouncedDesiredProbability)

  const probabilityQuery = useQuery({
    queryKey: ['room-boost-probability', roomId, apiUserId, parsedBoostAmount],
    enabled: apiUserId !== null && Number.isFinite(parsedBoostAmount) && parsedBoostAmount >= 0,
    queryFn: async () => calcRoomBoostProbability(roomId, apiUserId as number, parsedBoostAmount),
  })

  const requiredBoostQuery = useQuery({
    queryKey: ['room-boost-required', roomId, apiUserId, parsedDesiredProbability],
    enabled: apiUserId !== null && Number.isFinite(parsedDesiredProbability) && parsedDesiredProbability > 0 && parsedDesiredProbability < 100,
    queryFn: async () => calcRoomBoostAmount(roomId, apiUserId as number, parsedDesiredProbability),
  })

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      const resolvedApiUserId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      return leaveRoom(roomId, { user_id: resolvedApiUserId })
    },
  })

  const buyBoostMutation = useMutation({
    mutationFn: async () => {
      const resolvedApiUserId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      const parsedAmount = Number(boostAmount)
      if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Введите корректную сумму буста')
      }
      const boost = await buyRoomBoost(roomId, { user_id: resolvedApiUserId, amount: parsedAmount })
      return { boost, apiUserId: resolvedApiUserId }
    },
    onSuccess: async ({ apiUserId: resolvedApiUserId }) => {
      setBoostError('')
      setInsufficientFunds(null)
      await refreshUserBalance(resolvedApiUserId, onUserBalanceChange)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['room', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['room-boosts', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['room-winners', roomId] }),
      ])
    },
  })

  useEffect(() => {
    let isCancelled = false
    void resolveApiUserId(userId, userName, userBalance)
      .then((resolvedApiUserId) => {
        if (!isCancelled) setApiUserId(resolvedApiUserId)
      })
      .catch(() => {
        if (!isCancelled) setApiUserId(null)
      })
    return () => { isCancelled = true }
  }, [userBalance, userId, userName])

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedBoostAmount(boostAmount), BOOST_CALC_DEBOUNCE_MS)
    return () => window.clearTimeout(timerId)
  }, [boostAmount])

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedDesiredProbability(desiredProbability), BOOST_CALC_DEBOUNCE_MS)
    return () => window.clearTimeout(timerId)
  }, [desiredProbability])

  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => {
      setLiveRoom(snapshot)
      queryClient.setQueryData(['room', roomId], snapshot)
    })
  }, [queryClient, roomId])

  useEffect(() => {
    const timerId = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  const room = liveRoom ?? roomQuery.data ?? null
  const roomStatus = room?.status ?? 'new'

  useEffect(() => {
    if ((roomStatus === 'playing' || roomStatus === 'finished') && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      onStartGame(roomId)
    }
  }, [roomStatus, roomId, onStartGame])

  async function handleBuySeats(): Promise<void> {
    if (isBuyingSeats || hasPurchasedSeats) return
    setSeatError('')
    setIsBuyingSeats(true)
    try {
      const resolvedApiUserId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      await joinRoom(roomId, { user_id: resolvedApiUserId, places: placesToBuy })
      setHasPurchasedSeats(true)
      await refreshUserBalance(resolvedApiUserId, onUserBalanceChange)
      await queryClient.invalidateQueries({ queryKey: ['room-players', roomId] })
      await queryClient.invalidateQueries({ queryKey: ['room', roomId] })
    } catch (error: unknown) {
      setSeatError(mapSeatError(error))
    } finally {
      setIsBuyingSeats(false)
    }
  }

  async function handleBuyBoost(): Promise<void> {
    try {
      setBoostError('')
      setInsufficientFunds(null)
      await buyBoostMutation.mutateAsync()
    } catch (error: unknown) {
      const insufficientFundsState = mapInsufficientFunds(error)
      if (insufficientFundsState) setInsufficientFunds(insufficientFundsState)
      setBoostError(mapBoostError(error))
    }
  }

  async function handleLeaveRoomAndExit(onExit: () => void): Promise<void> {
    try {
      setLeaveError('')
      const resolvedApiUserId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      await leaveRoomMutation.mutateAsync()
      await refreshUserBalance(resolvedApiUserId, onUserBalanceChange)
      onExit()
    } catch (error: unknown) {
      setLeaveError(mapLobbyError(error))
    }
  }

  const players: RoomPlayer[] = playersQuery.data?.players ?? []
  const boostsCount = boostsQuery.data?.boosts.length ?? 0
  const hasPurchasedBoost = apiUserId !== null
    ? (boostsQuery.data?.boosts.some((b) => b.user_id === apiUserId) ?? false)
    : false
  const winners: RoomWinner[] = winnersQuery.data?.winners ?? []
  const isLoadingLobby = roomQuery.isLoading || playersQuery.isLoading
  const isLeavingLobby = leaveRoomMutation.isPending

  const occupiedSeats = players.reduce((sum, p) => sum + p.places, 0)
  const totalSeats = room?.players_needed ?? 0
  const freeSeats = Math.max(0, totalSeats - occupiedSeats)

  const seats: SeatInfo[] = useMemo(() => {
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

  const lobbyError = useMemo(() => {
    if (leaveError) return leaveError
    const firstError = roomQuery.error ?? playersQuery.error ?? boostsQuery.error
    return firstError ? mapLobbyError(firstError) : ''
  }, [boostsQuery.error, leaveError, playersQuery.error, roomQuery.error])

  const boostProbability = probabilityQuery.data?.probability ?? null
  const requiredBoostAmount = requiredBoostQuery.data?.boost_amount ?? null
  const maxPlacesToBuy = Math.min(freeSeats, 5)

  return {
    room,
    roomStatus,
    seats,
    players,
    boostsCount,
    hasPurchasedBoost,
    hasPurchasedSeats,
    winners,
    isLoadingLobby,
    lobbyError,
    isLeavingLobby,
    countdownLabel,
    boostAmount,
    setBoostAmount,
    desiredProbability,
    setDesiredProbability,
    boostProbability,
    requiredBoostAmount,
    handleBuyBoost,
    handleBuySeats,
    handleLeaveRoomAndExit,
    isBuyingBoost: buyBoostMutation.isPending,
    isBuyingSeats,
    seatError,
    boostError,
    placesToBuy,
    setPlacesToBuy,
    maxPlacesToBuy,
    freeSeats,
    apiUserId,
    insufficientFunds,
    closeInsufficientFunds: () => setInsufficientFunds(null),
  }
}

function mapLobbyError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message || 'Ошибка загрузки лобби.'
  if (error instanceof Error) return error.message
  return 'Не удалось обновить данные лобби.'
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

function mapBoostError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    if (error instanceof Error) return error.message
    return 'Не удалось купить буст.'
  }
  if (error.status === 402) return 'Недостаточно баллов для буста.'
  if (error.status === 409) return 'Вы уже купили буст для этой комнаты.'
  return error.message || 'Не удалось купить буст.'
}

function mapInsufficientFunds(error: unknown): { message: string; required: number; currentBalance: number; shortfall: number } | null {
  if (!(error instanceof ApiClientError) || error.status !== 402) return null
  const payload = error.details as { errors?: { message?: string; required?: number; current_balance?: number; shortfall?: number }; detail?: string }
  const required = payload.errors?.required
  const currentBalance = payload.errors?.current_balance
  const shortfall = payload.errors?.shortfall
  if (typeof required !== 'number' || typeof currentBalance !== 'number' || typeof shortfall !== 'number') return null
  return { message: payload.errors?.message || payload.detail || 'Недостаточно баллов.', required, currentBalance, shortfall }
}

async function getOrResolveApiUserId(currentApiUserId: number | null, userId: string, userName: string, userBalance: number): Promise<number> {
  if (currentApiUserId !== null) return currentApiUserId
  return resolveApiUserId(userId, userName, userBalance)
}

async function refreshUserBalance(apiUserId: number, onUserBalanceChange: (balance: number) => void): Promise<void> {
  try {
    const apiUser = await getUser(apiUserId)
    onUserBalanceChange(apiUser.balance)
  } catch { }
}
