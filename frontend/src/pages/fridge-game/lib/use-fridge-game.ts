import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiClientError,
  buyRoomBoost,
  connectRoomWS,
  getRoom,
  getUser,
  listRoomBoosts,
  listRoomPlayers,
  listRoomWinners,
} from '@shared/api'
import { resolveApiUserId } from '@processes/auth-session'
import type { Room, RoomPlayer, RoomBoost, RoomWinner } from '@shared/types'
import type { GamePhase, PlayerWithProbability } from '../model/types'
import { PRODUCTS, seededShuffle } from '../model/constants'

export type UseFridgeGameOptions = {
  roomId: number
  userId: string
  userName: string
  userBalance: number
  onUserBalanceChange: (balance: number) => void
  onBackToGames: () => void
  onPlayAgain: () => void
}

const BOOST_CALC_DEBOUNCE_MS = 300

export function useFridgeGame({ roomId, userId, userName, userBalance, onUserBalanceChange, onPlayAgain, onBackToGames }: UseFridgeGameOptions) {
  const [phase, setPhase] = useState<GamePhase>('boost')
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [apiUserId, setApiUserId] = useState<number | null>(null)
  const [boostAmount, setBoostAmount] = useState('1000')
  const [debouncedBoostAmount, setDebouncedBoostAmount] = useState('1000')
  const [boostError, setBoostError] = useState('')
  const hasTransitionedRef = useRef(false)
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['fridge-room', roomId],
    queryFn: () => getRoom(roomId),
    staleTime: 0,
  })

  const playersQuery = useQuery({
    queryKey: ['fridge-players', roomId],
    queryFn: () => listRoomPlayers(roomId),
    refetchInterval: phase === 'boost' ? 2000 : false,
  })

  const boostsQuery = useQuery({
    queryKey: ['fridge-boosts', roomId],
    queryFn: () => listRoomBoosts(roomId),
    refetchInterval: phase === 'boost' ? 2000 : false,
  })

  const winnersQuery = useQuery({
    queryKey: ['fridge-winners', roomId],
    queryFn: () => listRoomWinners(roomId),
    refetchInterval: phase === 'boost' ? 5000 : 3000,
  })

  const parsedBoostAmount = Number(debouncedBoostAmount)

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
      } catch { }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fridge-room', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['fridge-boosts', roomId] }),
        queryClient.invalidateQueries({ queryKey: ['fridge-winners', roomId] }),
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

  useEffect(() => {
    let cancelled = false
    void resolveApiUserId(userId, userName, userBalance)
      .then((id) => { if (!cancelled) setApiUserId(id) })
      .catch(() => { if (!cancelled) setApiUserId(null) })
    return () => { cancelled = true }
  }, [userId, userName, userBalance])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedBoostAmount(boostAmount), BOOST_CALC_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [boostAmount])

  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => {
      setLiveRoom(snapshot)
      queryClient.setQueryData(['fridge-room', roomId], snapshot)
    })
  }, [queryClient, roomId])

  const room = liveRoom ?? roomQuery.data ?? null
  const players: RoomPlayer[] = playersQuery.data?.players ?? []
  const boosts: RoomBoost[] = boostsQuery.data?.boosts ?? []
  const winners: RoomWinner[] = winnersQuery.data?.winners ?? []

  const boostEndTime = useMemo(() => {
    if (!room?.start_time) return null
    return new Date(room.start_time).getTime() + (room.round_duration_seconds ?? 30) * 1000
  }, [room?.start_time, room?.round_duration_seconds])

  const boostSecondsLeft = useMemo(() => {
    if (boostEndTime === null) return null
    return Math.max(0, Math.floor((boostEndTime - nowTick) / 1000))
  }, [boostEndTime, nowTick])

  // Transition to video when timer ends
  useEffect(() => {
    if (phase !== 'boost') return
    if (boostSecondsLeft !== null && boostSecondsLeft <= 0 && !hasTransitionedRef.current) {
      hasTransitionedRef.current = true
      setPhase('video')
    }
  }, [boostSecondsLeft, phase])

  // Also transition if room finishes without timer
  useEffect(() => {
    if (phase === 'boost' && room?.status === 'finished' && !hasTransitionedRef.current) {
      hasTransitionedRef.current = true
      setPhase('video')
    }
  }, [room?.status, phase])

  function handleVideoEnded(): void {
    setPhase('reveal')
    setTimeout(() => setPhase('results'), 5000)
  }

  /**
   * Probability formula matching backend settle (with bot-fill adjustment):
   *   weight_i = places_i * entry_cost + boost_i
   *   bot_weight = freeSeats * entry_cost  (remaining seats filled by bots)
   *   denominator = sum(player_weights) + bot_weight
   *   probability_i = weight_i / denominator * 100
   *
   * This gives accurate probabilities accounting for how bots fill empty seats.
   */
  const playersWithProbabilities: PlayerWithProbability[] = useMemo(() => {
    const boostByUser = new Map(boosts.map((b) => [b.user_id, b.amount]))
    const entryCost = room?.entry_cost ?? 0
    const totalSeats = room?.players_needed ?? 0
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
    const botWeight = botSeats * entryCost
    const denominator = playerWeightSum + botWeight

    return withWeights.map((p) => ({
      ...p,
      probability: denominator > 0 ? (p.weight / denominator) * 100 : 0,
    }))
  }, [players, boosts, room?.entry_cost, room?.players_needed, apiUserId])

  /**
   * Preview: what would be user's probability after adding boostAmount?
   * Uses same settle formula with bot fill.
   */
  const boostPreviewProbability = useMemo(() => {
    if (!Number.isFinite(parsedBoostAmount) || parsedBoostAmount <= 0) return null
    if (apiUserId === null) return null
    const entryCost = room?.entry_cost ?? 0
    const totalSeats = room?.players_needed ?? 0
    const boostByUser = new Map(boosts.map((b) => [b.user_id, b.amount]))
    const filledSeats = players.reduce((sum, p) => sum + p.places, 0)
    const botSeats = Math.max(0, totalSeats - filledSeats)

    const myPlaces = players.find((p) => p.user_id === apiUserId)?.places ?? 0
    const myCurrentBoost = boostByUser.get(apiUserId) ?? 0
    const myNewWeight = entryCost * myPlaces + myCurrentBoost + parsedBoostAmount

    const withWeights = players.map((p) => {
      const isMe = p.user_id === apiUserId
      return isMe ? myNewWeight : (entryCost * p.places + (boostByUser.get(p.user_id) ?? 0))
    })
    const playerWeightSum = withWeights.reduce((sum, w) => sum + w, 0)
    const botWeight = botSeats * entryCost
    const denominator = playerWeightSum + botWeight
    return denominator > 0 ? (myNewWeight / denominator) * 100 : null
  }, [parsedBoostAmount, apiUserId, players, boosts, room?.entry_cost, room?.players_needed])

  const myProbability = playersWithProbabilities.find((p) => p.isMe)?.probability ?? null
  const hasPurchasedBoost = apiUserId !== null ? boosts.some((b) => b.user_id === apiUserId) : false

  const winner = winners[0] ?? null
  const isWinner = winner !== null && apiUserId !== null && winner.user_id === apiUserId

  const totalSeats = room?.players_needed ?? 0
  const seatProducts = useMemo(() => {
    const shuffled = seededShuffle(PRODUCTS, roomId)
    return Array.from({ length: Math.max(totalSeats, 1) }, (_, i) => shuffled[i % shuffled.length])
  }, [roomId, totalSeats])

  const seatAssignments = useMemo(() => {
    const assignments: { seatNumber: number; userId: number | null; isWinner: boolean }[] = []
    let seatIndex = 1
    const sorted = [...players].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    for (const player of sorted) {
      for (let i = 0; i < player.places; i++) {
        assignments.push({
          seatNumber: seatIndex++,
          userId: player.user_id,
          isWinner: winner !== null && player.user_id === winner.user_id,
        })
      }
    }
    while (seatIndex <= totalSeats) {
      assignments.push({ seatNumber: seatIndex++, userId: null, isWinner: false })
    }
    return assignments
  }, [players, winner, totalSeats])

  return {
    phase,
    room,
    boostSecondsLeft,
    playersWithProbabilities,
    myProbability,
    hasPurchasedBoost,
    boostAmount,
    setBoostAmount,
    boostPreviewProbability,
    buyBoostMutation,
    boostError,
    handleVideoEnded,
    isWinner,
    winner,
    seatProducts,
    seatAssignments,
    apiUserId,
    userName,
    onPlayAgain,
    onBackToGames,
  }
}

async function getOrResolveApiUserId(current: number | null, userId: string, userName: string, userBalance: number): Promise<number> {
  if (current !== null) return current
  return resolveApiUserId(userId, userName, userBalance)
}
