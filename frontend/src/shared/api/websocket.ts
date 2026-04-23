import type { Room } from '@shared/types'

type RoomSnapshotListener = (room: Room) => void

function getWsBaseUrl(rawApiUrl: string): string {
  const normalized = rawApiUrl.replace(/\/+$/, '')
  const withoutApiPrefix = normalized.endsWith('/api/v1') ? normalized.slice(0, -7) : normalized

  if (withoutApiPrefix.startsWith('https://')) {
    return `wss://${withoutApiPrefix.slice('https://'.length)}`
  }
  if (withoutApiPrefix.startsWith('http://')) {
    return `ws://${withoutApiPrefix.slice('http://'.length)}`
  }
  return `ws://${withoutApiPrefix}`
}

export function connectRoomWS(roomId: number, onSnapshot: RoomSnapshotListener): () => void {
  const wsBaseUrl = getWsBaseUrl(import.meta.env.VITE_API_URL ?? 'http://localhost:8888')
  const wsUrl = `${wsBaseUrl}/api/v1/rooms/${roomId}/ws`

  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let isClosedManually = false

  const connect = () => {
    socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Room
        onSnapshot(payload)
      } catch {
        // Ignore malformed WS payloads from external systems.
      }
    }

    socket.onclose = () => {
      if (isClosedManually) {
        return
      }

      reconnectTimer = window.setTimeout(connect, 2000)
    }
  }

  connect()

  return () => {
    isClosedManually = true
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close()
    }
  }
}

