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
  leaveRoom,
  listRounds,
  listRoomBoosts,
  listRoomPlayers,
  listRoomWinners,
} from '@shared/api'
import { resolveApiUserId } from '@processes/auth-session'
import type { Room, RoomWinner, Round } from '@shared/types'

const COPY_RESET_MS = 1400
const ROOM_CODE = 'STNBGH'
const BOOST_CALC_DEBOUNCE_MS = 250

type UseLobbyOptions = {
  roomId: number
  onStartGame: () => void
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
  const [copied, setCopied] = useState(false)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [isJournalOpen, setIsJournalOpen] = useState(false)
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
  const copyTimerRef = useRef<number | null>(null)
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => getRoom(roomId),
  })

  const playersQuery = useQuery({
    queryKey: ['room-players', roomId],
    queryFn: async () => listRoomPlayers(roomId),
  })

  const boostsQuery = useQuery({
    queryKey: ['room-boosts', roomId],
    queryFn: async () => listRoomBoosts(roomId),
  })

  const winnersQuery = useQuery({
    queryKey: ['room-winners', roomId],
    queryFn: async () => listRoomWinners(roomId),
  })

  const roundsQuery = useQuery({
    queryKey: ['rounds'],
    queryFn: listRounds,
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

      const boost = await buyRoomBoost(roomId, {
        user_id: resolvedApiUserId,
        amount: parsedAmount,
      })

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
        if (!isCancelled) {
          setApiUserId(resolvedApiUserId)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setApiUserId(null)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [userBalance, userId, userName])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedBoostAmount(boostAmount)
    }, BOOST_CALC_DEBOUNCE_MS)

    return () => window.clearTimeout(timerId)
  }, [boostAmount])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedDesiredProbability(desiredProbability)
    }, BOOST_CALC_DEBOUNCE_MS)

    return () => window.clearTimeout(timerId)
  }, [desiredProbability])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() === 'e') {
        onStartGame()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onStartGame])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => {
      setLiveRoom(snapshot)
      queryClient.setQueryData(['room', roomId], snapshot)
    })
  }, [queryClient, roomId])

  const room = liveRoom ?? roomQuery.data ?? null

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  async function handleCopyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(ROOM_CODE)
      setCopied(true)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), COPY_RESET_MS)
    } catch {
      setCopied(false)
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

  async function handleBuyBoost(): Promise<void> {
    try {
      setBoostError('')
      setInsufficientFunds(null)
      await buyBoostMutation.mutateAsync()
    } catch (error: unknown) {
      const insufficientFundsState = mapInsufficientFunds(error)
      if (insufficientFundsState) {
        setInsufficientFunds(insufficientFundsState)
      }
      setBoostError(mapBoostError(error))
    }
  }

  const playersCount = playersQuery.data?.players.length ?? 0
  const boostsCount = boostsQuery.data?.boosts.length ?? 0
  const hasPurchasedBoost =
    apiUserId !== null ? (boostsQuery.data?.boosts.some((boost) => boost.user_id === apiUserId) ?? false) : false
  const winners: RoomWinner[] = winnersQuery.data?.winners ?? []
  const rounds: Round[] = roundsQuery.data?.rounds ?? []
  const roomStartTime = room?.start_time ?? null
  const isLoadingLobby = roomQuery.isLoading || playersQuery.isLoading || boostsQuery.isLoading
  const lobbyError = useMemo(() => {
    if (leaveError) {
      return leaveError
    }
    const firstError = roomQuery.error ?? playersQuery.error ?? boostsQuery.error ?? roundsQuery.error
    if (firstError) {
      return mapLobbyError(firstError)
    }
    return ''
  }, [boostsQuery.error, leaveError, playersQuery.error, roomQuery.error, roundsQuery.error])

  const countdownLabel = useMemo(() => {
    if (!roomStartTime) {
      return '--:--'
    }

    const startAt = new Date(roomStartTime).getTime()
    const diffSeconds = Math.max(0, Math.floor((startAt - nowTick) / 1000))
    const secondsToStart = Number.isFinite(diffSeconds) ? diffSeconds : 0

    const minutes = Math.floor(secondsToStart / 60)
    const seconds = secondsToStart % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [nowTick, roomStartTime])

  const boostProbability = probabilityQuery.data?.probability ?? null
  const requiredBoostAmount = requiredBoostQuery.data?.boost_amount ?? null

  function closeInsufficientFunds(): void {
    setInsufficientFunds(null)
  }

  return {
    copied,
    isSimulationOpen,
    setIsSimulationOpen,
    isJournalOpen,
    setIsJournalOpen,
    handleCopyCode,
    handleLeaveRoomAndExit,
    room,
    playersCount,
    boostsCount,
    isLoadingLobby,
    lobbyError,
    boostAmount,
    setBoostAmount,
    desiredProbability,
    setDesiredProbability,
    boostProbability,
    requiredBoostAmount,
    handleBuyBoost,
    isBuyingBoost: buyBoostMutation.isPending,
    hasPurchasedBoost,
    boostError,
    winners,
    rounds,
    isLeavingLobby: leaveRoomMutation.isPending,
    countdownLabel,
    insufficientFunds,
    closeInsufficientFunds,
  }
}

function mapLobbyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message || 'Ошибка загрузки лобби.'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Не удалось обновить данные лобби.'
}

function mapBoostError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    if (error instanceof Error) {
      return error.message
    }
    return 'Не удалось купить буст.'
  }

  if (error.status === 402) {
    return 'Недостаточно баллов для буста.'
  }
  if (error.status === 409) {
    return 'Вы уже купили буст для этой комнаты.'
  }
  return error.message || 'Не удалось купить буст.'
}

function mapInsufficientFunds(error: unknown): InsufficientFundsState | null {
  if (!(error instanceof ApiClientError) || error.status !== 402) {
    return null
  }

  const payload = error.details as {
    errors?: {
      message?: string
      required?: number
      current_balance?: number
      shortfall?: number
    }
    detail?: string
  }

  const required = payload.errors?.required
  const currentBalance = payload.errors?.current_balance
  const shortfall = payload.errors?.shortfall

  if (typeof required !== 'number' || typeof currentBalance !== 'number' || typeof shortfall !== 'number') {
    return null
  }

  return {
    message: payload.errors?.message || payload.detail || 'Недостаточно баллов для операции.',
    required,
    currentBalance,
    shortfall,
  }
}

async function getOrResolveApiUserId(
  currentApiUserId: number | null,
  userId: string,
  userName: string,
  userBalance: number,
): Promise<number> {
  if (currentApiUserId !== null) {
    return currentApiUserId
  }

  return resolveApiUserId(userId, userName, userBalance)
}

async function refreshUserBalance(apiUserId: number, onUserBalanceChange: (balance: number) => void): Promise<void> {
  try {
    const apiUser = await getUser(apiUserId)
    onUserBalanceChange(apiUser.balance)
  } catch {
    // Keep flow resilient if user-profile sync endpoint is temporarily unavailable.
  }
}
