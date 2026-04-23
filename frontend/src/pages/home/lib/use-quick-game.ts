import { useState } from 'react'

import { ApiClientError, listRooms } from '@shared/api'

type UseQuickGameOptions = {
  userId: string
  userName: string
  userBalance: number
  onJoinLobby: (roomId: number) => void
}

function mapQuickGameError(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Произошла ошибка. Попробуйте снова.'
}

// We intentionally do NOT auto-join the room here — joining (and choosing how
// many plates to occupy) must happen inside the lobby. Quick game just picks
// the first room that is open for new players and navigates the user there.
export function useQuickGame({ userId, userName, userBalance, onJoinLobby }: UseQuickGameOptions) {
  void userId; void userName; void userBalance
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleQuickGame(): Promise<void> {
    setIsLoading(true)
    setError('')
    try {
      const { rooms } = await listRooms({ status: 'new' })
      const target = rooms.find((r) => r.current_players < r.players_needed) ?? rooms[0]
      if (!target) {
        setError('Нет доступных комнат')
        return
      }
      onJoinLobby(target.room_id)
    } catch (err) {
      setError(mapQuickGameError(err))
    } finally {
      setIsLoading(false)
    }
    void ApiClientError
  }

  return { handleQuickGame, isLoading, error }
}
