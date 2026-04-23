import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Room } from '@shared/types'
import {
  ApiClientError,
  buyRoomBoost,
  connectRoomWS,
  getRoom,
  getUser,
  joinRoom,
} from '@shared/api'
import { resolveApiUserId } from '@processes/auth-session'
import {
  FINISH_COUNTDOWN_SECONDS,
  INITIAL_BANK,
  INITIAL_WIN_CHANCE,
} from '../model/constants'
import type { GameState } from '../model/types'

export type UseFridgeGameOptions = {
  roomId: number
  userId: string
  userName: string
  userBalance: number
  onUserBalanceChange: (balance: number) => void
}

export function formatMoney(val: number): string {
  return val.toLocaleString('ru-RU') + ' STL'
}

export function useFridgeGame({ roomId, userId, userName, userBalance, onUserBalanceChange }: UseFridgeGameOptions) {
  const [gameState, setGameState] = useState<GameState>('video')
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [bonusInput, setBonusInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(FINISH_COUNTDOWN_SECONDS)
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [joinError, setJoinError] = useState('')
  const [hasBoosted, setHasBoosted] = useState(false)

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoom(roomId),
  })

  useEffect(() => {
    return connectRoomWS(roomId, (snapshot) => setLiveRoom(snapshot))
  }, [roomId])

  const room = liveRoom ?? roomQuery.data ?? null
  const bank = room?.jackpot ?? INITIAL_BANK
  const winChance = room ? Math.round(100 / Math.max(1, room.players_needed)) : INITIAL_WIN_CHANCE

  useEffect(() => {
    let cancelled = false
    resolveApiUserId(userId, userName, userBalance)
      .then((apiUserId) => joinRoom(roomId, { user_id: apiUserId, places: 1 }))
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiClientError && err.status === 402) {
            setJoinError('Недостаточно баллов для входа в игру')
          } else {
            setJoinError((err as Error).message || 'Ошибка при входе в игру')
          }
        }
      })
    return () => {
      cancelled = true
    }
  }, [roomId, userBalance, userId, userName])

  useEffect(() => {
    if (gameState !== 'bonus_added' || selectedCell === null || timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('finished')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [gameState, selectedCell, timeLeft])

  const buyBoostMutation = useMutation({
    mutationFn: async () => {
      const apiUserId = await resolveApiUserId(userId, userName, userBalance)
      return buyRoomBoost(roomId, { user_id: apiUserId, amount: Number(bonusInput) })
    },
    onSuccess: async () => {
      setGameState('bonus_added')
      try {
        const apiUserId = await resolveApiUserId(userId, userName, userBalance)
        const apiUser = await getUser(apiUserId)
        onUserBalanceChange(apiUser.balance)
      } catch {
        // balance refresh failure is non-critical
      }
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 409) {
        setHasBoosted(true)
      }
    },
  })

  function handleCellClick(id: number): void {
    if (gameState === 'bonus_added' && selectedCell === null) {
      setSelectedCell(id)
      setTimeLeft(FINISH_COUNTDOWN_SECONDS)
    }
  }

  function handleVideoEnded(): void {
    setGameState('initial')
  }

  function handleRestart(): void {
    window.location.reload()
  }

  return {
    gameState,
    selectedCell,
    bonusInput,
    setBonusInput,
    timeLeft,
    bank,
    winChance,
    buyBoostMutation,
    handleCellClick,
    handleVideoEnded,
    handleRestart,
    joinError,
    hasBoosted,
  }
}
