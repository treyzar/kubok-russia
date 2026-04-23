import { useState } from 'react'

import { resolveApiUserId } from '@processes/auth-session'
import { ApiClientError, joinRoom, listRooms } from '@shared/api'

type UseQuickGameOptions = {
  userId: string
  userName: string
  userBalance: number
  onJoinLobby: (roomId: number) => void
}

function mapQuickGameError(err: unknown): string {
  if (err instanceof ApiClientError && err.status === 402) {
    const details = err.details as { needed?: number; available?: number; shortage?: number } | null
    if (details && typeof details.needed === 'number') {
      return `Недостаточно баллов. Нужно: ${details.needed}, доступно: ${details.available ?? 0}, не хватает: ${details.shortage ?? details.needed - (details.available ?? 0)}.`
    }
    return 'Недостаточно баллов для входа в комнату.'
  }
  if (err instanceof Error) return err.message
  return 'Произошла ошибка. Попробуйте снова.'
}

export function useQuickGame({ userId, userName, userBalance, onJoinLobby }: UseQuickGameOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleQuickGame(): Promise<void> {
    setIsLoading(true)
    setError('')
    try {
      const { rooms } = await listRooms({ status: 'new' })
      if (rooms.length === 0) {
        setError('Нет доступных комнат')
        return
      }
      const apiUserId = await resolveApiUserId(userId, userName, userBalance)
      for (const room of rooms) {
        try {
          await joinRoom(room.room_id, { user_id: apiUserId, places: 1 })
          onJoinLobby(room.room_id)
          return
        } catch (err) {
          if (err instanceof ApiClientError && err.status === 409) {
            const detail = (err.details as { detail?: string } | null)?.detail
            if (detail === 'room is full') continue
          }
          throw err
        }
      }
      setError('Нет доступных комнат')
    } catch (err) {
      setError(mapQuickGameError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return { handleQuickGame, isLoading, error }
}
