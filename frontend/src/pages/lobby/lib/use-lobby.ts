import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  ApiClientError,
  buyRoomBoost,
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
import type { Room, RoomBoost, RoomPlayer, RoomWinner } from '@shared/types'
import {
  PRODUCTS,
  maxBuyablePlaces,
  seededShuffle,
} from '../model/constants'
import type {
  GamePhase,
  PlayerWithProbability,
  RevealSeatInfo,
  SeatInfo,
} from '../model/types'

type UseLobbyOptions = {
  roomId: number
  onUserBalanceChange: (balance: number) => void
  userId: string
  userName: string
  userBalance: number
}

const BOOST_DEBOUNCE_MS = 300
const REVEAL_TO_RESULTS_MS = 6000

export function useLobby({
  roomId,
  onUserBalanceChange,
  userId,
  userName,
  userBalance,
}: UseLobbyOptions) {
  const queryClient = useQueryClient()
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [apiUserId, setApiUserId] = useState<number | null>(null)

  // Lobby (selection) state
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set())
  const [isBuyingSeats, setIsBuyingSeats] = useState(false)
  const [hasPurchasedSeats, setHasPurchasedSeats] = useState(false)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [seatError, setSeatError] = useState('')
  const [leaveError, setLeaveError] = useState('')

  // Boost state
  const [boostAmount, setBoostAmount] = useState('1000')
  const [debouncedBoostAmount, setDebouncedBoostAmount] = useState('1000')
  const [boostError, setBoostError] = useState('')

  // Game phase state
  const [postVideoPhase, setPostVideoPhase] = useState<'reveal' | 'results' | null>(null)
  const [hasVideoFinished, setHasVideoFinished] = useState(false)

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoom(roomId),
    staleTime: 0,
  })

  const playersQuery = useQuery({
    queryKey: ['room-players', roomId],
    queryFn: () => listRoomPlayers(roomId),
    refetchInterval: 2000,
  })

  const boostsQuery = useQuery({
    queryKey: ['room-boosts', roomId],
    queryFn: () => listRoomBoosts(roomId),
    refetchInterval: 2000,
  })

  const winnersQuery = useQuery({
    queryKey: ['room-winners', roomId],
    queryFn: () => listRoomWinners(roomId),
    refetchInterval: 3000,
  })

  // Resolve API user id once
  useEffect(() => {
    let cancelled = false
    void resolveApiUserId(userId, userName, userBalance)
      .then((id) => { if (!cancelled) setApiUserId(id) })
      .catch(() => { if (!cancelled) setApiUserId(null) })
    return () => { cancelled = true }
  }, [userId, userName, userBalance])

  // Tick for timers
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  // Boost amount debounce
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedBoostAmount(boostAmount), BOOST_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [boostAmount])

  // Live WS room snapshot
  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => {
      setLiveRoom(snapshot)
      queryClient.setQueryData(['room', roomId], snapshot)
    })
  }, [queryClient, roomId])

  const room = liveRoom ?? roomQuery.data ?? null
  const roomStatus = room?.status ?? 'new'
  const players: RoomPlayer[] = playersQuery.data?.players ?? []
  const boosts: RoomBoost[] = boostsQuery.data?.boosts ?? []
  const winners: RoomWinner[] = winnersQuery.data?.winners ?? []

  const totalSeats = room?.players_needed ?? 0
  const occupiedSeats = players.reduce((sum, p) => sum + p.places, 0)
  const freeSeats = Math.max(0, totalSeats - occupiedSeats)

  const hasJoined = useMemo(() => {
    if (hasPurchasedSeats) return true
    if (apiUserId === null) return false
    return players.some((p) => p.user_id === apiUserId)
  }, [hasPurchasedSeats, apiUserId, players])

  const myPlaces = useMemo(() => {
    if (apiUserId === null) return 0
    return players.find((p) => p.user_id === apiUserId)?.places ?? 0
  }, [apiUserId, players])

  // --- Seat assignments (deterministic order by joined_at) -------------------
  const seats: SeatInfo[] = useMemo(() => {
    if (totalSeats === 0) return []
    const result: SeatInfo[] = []
    let seatIndex = 1
    const sorted = [...players].sort((a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
    )
    for (const player of sorted) {
      for (let i = 0; i < player.places; i++) {
        result.push({
          seatNumber: seatIndex++,
          userId: player.user_id,
          isMe: player.user_id === apiUserId,
        })
      }
    }
    while (seatIndex <= totalSeats) {
      result.push({ seatNumber: seatIndex++, userId: null, isMe: false })
    }
    return result
  }, [players, apiUserId, totalSeats])

  const winner = winners[0] ?? null

  const seatProductsList = useMemo(() => {
    if (totalSeats === 0) return []
    const shuffled = seededShuffle(PRODUCTS, roomId)
    return Array.from({ length: totalSeats }, (_, i) => shuffled[i % shuffled.length])
  }, [roomId, totalSeats])

  const revealSeats: RevealSeatInfo[] = useMemo(() => {
    return seats.map((seat, idx) => {
      const product = seatProductsList[idx] ?? PRODUCTS[0]
      return {
        ...seat,
        productSrc: product.src,
        productLabel: product.label,
        isWinner: winner !== null && seat.userId !== null && seat.userId === winner.user_id,
      }
    })
  }, [seats, seatProductsList, winner])

  // --- Selection handlers ----------------------------------------------------
  const maxPlacesToBuy = maxBuyablePlaces(totalSeats, freeSeats)

  function toggleSeat(seatNumber: number): void {
    setSeatError('')
    setSelectedSeats((prev) => {
      const next = new Set(prev)
      if (next.has(seatNumber)) {
        next.delete(seatNumber)
        return next
      }
      if (next.size >= maxPlacesToBuy) {
        setSeatError(`Можно занять не более ${maxPlacesToBuy} ${pluralPlaces(maxPlacesToBuy)} (50% от мест в комнате).`)
        return prev
      }
      next.add(seatNumber)
      return next
    })
  }

  function clearSelection(): void {
    setSelectedSeats(new Set())
    setSeatError('')
  }

  // Drop selection if seats become unavailable / I joined / phase changed
  useEffect(() => {
    if (hasJoined || roomStatus !== 'new' && roomStatus !== 'starting_soon') {
      if (selectedSeats.size > 0) setSelectedSeats(new Set())
      return
    }
    setSelectedSeats((prev) => {
      let changed = false
      const next = new Set<number>()
      for (const num of prev) {
        const seat = seats.find((s) => s.seatNumber === num)
        if (seat && seat.userId === null) next.add(num)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [seats, hasJoined, roomStatus, selectedSeats.size])

  async function handleBuySeats(): Promise<void> {
    if (isBuyingSeats || hasJoined) return
    const places = selectedSeats.size
    if (places <= 0) {
      setSeatError('Выберите хотя бы одну тарелку.')
      return
    }
    setSeatError('')
    setIsBuyingSeats(true)
    try {
      const resolvedId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      await joinRoom(roomId, { user_id: resolvedId, places })
      setHasPurchasedSeats(true)
      setSelectedSeats(new Set())
      try {
        const apiUser = await getUser(resolvedId)
        onUserBalanceChange(apiUser.balance)
      } catch { /* best-effort balance refresh */ }
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

  // --- Boost mutation --------------------------------------------------------
  const buyBoostMutation = useMutation({
    mutationFn: async () => {
      const resolvedId = await getOrResolveApiUserId(apiUserId, userId, userName, userBalance)
      const amount = Number(boostAmount)
      if (!Number.isInteger(amount) || amount <= 0) throw new Error('Введите корректную сумму')
      await buyRoomBoost(roomId, { user_id: resolvedId, amount })
      return resolvedId
    },
    onSuccess: async (resolvedId) => {
      setBoostError('')
      try {
        const apiUser = await getUser(resolvedId)
        onUserBalanceChange(apiUser.balance)
      } catch { /* ignore */ }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['room', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['room-boosts', roomId] }),
      ])
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 409) {
        setBoostError('Вы уже купили буст для этой игры.')
      } else if (err instanceof ApiClientError && err.status === 402) {
        setBoostError('Недостаточно баллов для буста.')
      } else if (err instanceof Error) {
        setBoostError(err.message)
      } else {
        setBoostError('Не удалось купить буст.')
      }
    },
  })

  // --- Probabilities ---------------------------------------------------------
  const playersWithProbabilities: PlayerWithProbability[] = useMemo(() => {
    const boostByUser = new Map(boosts.map((b) => [b.user_id, b.amount]))
    const entryCost = room?.entry_cost ?? 0
    const filledSeats = players.reduce((sum, p) => sum + p.places, 0)
    const botSeats = Math.max(0, totalSeats - filledSeats)

    const withWeights = players.map((p) => ({
      userId: p.user_id,
      places: p.places,
      boostAmount: boostByUser.get(p.user_id) ?? 0,
      weight: entryCost * p.places + (boostByUser.get(p.user_id) ?? 0),
      isMe: p.user_id === apiUserId,
      probability: 0,
    }))

    const playerWeightSum = withWeights.reduce((sum, p) => sum + p.weight, 0)
    const denominator = playerWeightSum + botSeats * entryCost

    return withWeights.map((p) => ({
      ...p,
      probability: denominator > 0 ? (p.weight / denominator) * 100 : 0,
    }))
  }, [players, boosts, room?.entry_cost, totalSeats, apiUserId])

  const myProbability = playersWithProbabilities.find((p) => p.isMe)?.probability ?? null
  const hasPurchasedBoost =
    apiUserId !== null && boosts.some((b) => b.user_id === apiUserId)

  const parsedBoostAmount = Number(debouncedBoostAmount)
  const boostPreviewProbability = useMemo(() => {
    if (!Number.isFinite(parsedBoostAmount) || parsedBoostAmount <= 0) return null
    if (apiUserId === null) return null
    const entryCost = room?.entry_cost ?? 0
    const boostByUser = new Map(boosts.map((b) => [b.user_id, b.amount]))
    const filledSeats = players.reduce((sum, p) => sum + p.places, 0)
    const botSeats = Math.max(0, totalSeats - filledSeats)
    const myPlayerPlaces = players.find((p) => p.user_id === apiUserId)?.places ?? 0
    const myCurrentBoost = boostByUser.get(apiUserId) ?? 0
    const myNewWeight = entryCost * myPlayerPlaces + myCurrentBoost + parsedBoostAmount

    let playerWeightSum = 0
    for (const p of players) {
      if (p.user_id === apiUserId) playerWeightSum += myNewWeight
      else playerWeightSum += entryCost * p.places + (boostByUser.get(p.user_id) ?? 0)
    }
    const denominator = playerWeightSum + botSeats * entryCost
    return denominator > 0 ? (myNewWeight / denominator) * 100 : null
  }, [parsedBoostAmount, apiUserId, players, boosts, room?.entry_cost, totalSeats])

  // --- Phase / timer logic ---------------------------------------------------
  const startTimeMs = room?.start_time ? new Date(room.start_time).getTime() : null
  const roundDuration = room?.round_duration_seconds ?? 30
  const boostEndMs = startTimeMs !== null ? startTimeMs + roundDuration * 1000 : null

  const lobbySecondsLeft = useMemo(() => {
    if (startTimeMs === null) return null
    return Math.max(0, Math.floor((startTimeMs - nowTick) / 1000))
  }, [startTimeMs, nowTick])

  const boostSecondsLeft = useMemo(() => {
    if (boostEndMs === null) return null
    return Math.max(0, Math.floor((boostEndMs - nowTick) / 1000))
  }, [boostEndMs, nowTick])

  const isPlayingPhase = roomStatus === 'playing'
  const isFinishedPhase = roomStatus === 'finished'

  const phase: GamePhase = useMemo(() => {
    if (isFinishedPhase || (isPlayingPhase && boostSecondsLeft !== null && boostSecondsLeft <= 0)) {
      if (postVideoPhase === 'results') return 'results'
      if (hasVideoFinished) return 'reveal'
      return 'video'
    }
    if (isPlayingPhase) return 'boost'
    return 'lobby'
  }, [isFinishedPhase, isPlayingPhase, boostSecondsLeft, hasVideoFinished, postVideoPhase])

  // After reveal, schedule the results modal
  const revealTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (phase === 'reveal' && postVideoPhase !== 'results') {
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = window.setTimeout(() => {
        setPostVideoPhase('results')
      }, REVEAL_TO_RESULTS_MS)
    }
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [phase, postVideoPhase])

  function handleVideoEnded(): void {
    setHasVideoFinished(true)
    if (postVideoPhase === null) setPostVideoPhase('reveal')
  }

  // --- Misc ------------------------------------------------------------------
  const countdownLabel = useMemo(() => {
    if (lobbySecondsLeft === null) return null
    const m = Math.floor(lobbySecondsLeft / 60)
    const s = lobbySecondsLeft % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [lobbySecondsLeft])

  const lobbyError = useMemo(() => {
    if (leaveError) return leaveError
    const firstError = roomQuery.error ?? playersQuery.error
    if (!firstError) return ''
    if (firstError instanceof ApiClientError) return firstError.message || 'Ошибка загрузки лобби.'
    if (firstError instanceof Error) return firstError.message
    return 'Не удалось обновить данные лобби.'
  }, [leaveError, roomQuery.error, playersQuery.error])

  const isWinner =
    winner !== null && apiUserId !== null && winner.user_id === apiUserId

  const entryCost = room?.entry_cost ?? 0
  const totalCost = entryCost * selectedSeats.size

  return {
    room,
    roomStatus,
    phase,
    seats,
    revealSeats,
    players,
    boosts,
    winner,
    isWinner,
    boostsCount: boosts.length,
    hasJoined,
    myPlaces,
    isLoadingLobby: roomQuery.isLoading,
    lobbyError,
    isLeavingRoom,
    countdownLabel,
    lobbySecondsLeft,
    boostSecondsLeft,
    roundDuration,
    handleLeaveRoomAndExit,
    handleBuySeats,
    isBuyingSeats,
    seatError,
    selectedSeats,
    toggleSeat,
    clearSelection,
    maxPlacesToBuy,
    freeSeats,
    totalSeats,
    apiUserId,
    entryCost,
    totalCost,
    playersWithProbabilities,
    myProbability,
    hasPurchasedBoost,
    boostAmount,
    setBoostAmount,
    boostPreviewProbability,
    buyBoostMutation,
    boostError,
    handleVideoEnded,
  }
}

async function getOrResolveApiUserId(
  current: number | null,
  userId: string,
  userName: string,
  userBalance: number,
): Promise<number> {
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

function pluralPlaces(n: number): string {
  const r = n % 10
  if (n % 100 >= 11 && n % 100 <= 14) return 'тарелок'
  if (r === 1) return 'тарелки'
  if (r >= 2 && r <= 4) return 'тарелок'
  return 'тарелок'
}
