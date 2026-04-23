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
  const [desiredProbability, setDesiredProbability] = useState('20')
  const [debouncedBoostAmount, setDebouncedBoostAmount] = useState('1000')
  const [debouncedDesiredProbability, setDebouncedDesiredProbability] = useState('20')
  const [boostError, setBoostError] = useState('')
  const hasTransitionedToVideoRef = useRef(false)
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['fridge-room', roomId],
    queryFn: () => getRoom(roomId),
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
    refetchInterval: phase === 'boost' ? 5000 : false,
  })

  const parsedBoostAmount = Number(debouncedBoostAmount)
  const parsedDesiredProbability = Number(debouncedDesiredProbability)

  const probabilityQuery = useQuery({
    queryKey: ['fridge-boost-probability', roomId, apiUserId, parsedBoostAmount],
    enabled: apiUserId !== null && Number.isFinite(parsedBoostAmount) && parsedBoostAmount >= 0 && phase === 'boost',
    queryFn: () => calcRoomBoostProbability(roomId, apiUserId as number, parsedBoostAmount),
  })

  const requiredBoostQuery = useQuery({
    queryKey: ['fridge-boost-required', roomId, apiUserId, parsedDesiredProbability],
    enabled: apiUserId !== null && Number.isFinite(parsedDesiredProbability) && parsedDesiredProbability > 0 && parsedDesiredProbability < 100 && phase === 'boost',
    queryFn: () => calcRoomBoostAmount(roomId, apiUserId as number, parsedDesiredProbability),
  })

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
    const id = window.setTimeout(() => setDebouncedDesiredProbability(desiredProbability), BOOST_CALC_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [desiredProbability])

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
    if (!boostEndTime) return null
    return Math.max(0, Math.floor((boostEndTime - nowTick) / 1000))
  }, [boostEndTime, nowTick])

  useEffect(() => {
    if (phase !== 'boost') return
    if (boostSecondsLeft === null) return
    if (boostSecondsLeft <= 0 && !hasTransitionedToVideoRef.current) {
      hasTransitionedToVideoRef.current = true
      setPhase('video')
    }
  }, [boostSecondsLeft, phase])

  useEffect(() => {
    if (phase === 'boost' && (room?.status === 'finished')) {
      if (!hasTransitionedToVideoRef.current) {
        hasTransitionedToVideoRef.current = true
        setPhase('video')
      }
    }
  }, [room?.status, phase])

  function handleVideoEnded(): void {
    setPhase('reveal')
    setTimeout(() => setPhase('results'), 5000)
  }

  const playersWithProbabilities: PlayerWithProbability[] = useMemo(() => {
    const boostByUser = new Map(boosts.map((b) => [b.user_id, b.amount]))
    const entryCost = room?.entry_cost ?? 0
    const withStakes = players.map((p) => ({
      userId: p.user_id,
      places: p.places,
      boostAmount: boostByUser.get(p.user_id) ?? 0,
      totalStake: entryCost * p.places + (boostByUser.get(p.user_id) ?? 0),
      isMe: p.user_id === apiUserId,
      probability: 0,
    }))
    const totalStakes = withStakes.reduce((sum, p) => sum + p.totalStake, 0)
    return withStakes.map((p) => ({
      ...p,
      probability: totalStakes > 0 ? (p.totalStake / totalStakes) * 100 : players.length > 0 ? 100 / players.length : 0,
    }))
  }, [players, boosts, room?.entry_cost, apiUserId])

  const myProbability = playersWithProbabilities.find((p) => p.isMe)?.probability ?? null
  const hasPurchasedBoost = apiUserId !== null ? boosts.some((b) => b.user_id === apiUserId) : false

  const winner = winners[0] ?? null
  const isWinner = winner !== null && apiUserId !== null && winner.user_id === apiUserId

  const totalSeats = room?.players_needed ?? 0
  const seatProducts = useMemo(() => {
    const shuffled = seededShuffle(PRODUCTS, roomId)
    return Array.from({ length: totalSeats }, (_, i) => shuffled[i % shuffled.length])
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
    desiredProbability,
    setDesiredProbability,
    boostProbabilityPreview: probabilityQuery.data?.probability ?? null,
    requiredBoostAmount: requiredBoostQuery.data?.boost_amount ?? null,
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
