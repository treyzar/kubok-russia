/**
 * Server room events broadcast via WebSocket. Mirrors the backend envelope
 * produced by `EventPublisher` (channel `room:{roomId}`):
 *
 *   { type: "...", room_id: 1, timestamp: "...", data?: {...} }
 *
 * The backend never broadcasts a full `Room` snapshot — only typed events.
 * The client refetches the canonical room/players state via the REST API in
 * response to these notifications.
 */
export type RoomEventType =
  | 'player_joined'
  | 'boost_applied'
  | 'room_starting'
  | 'game_started'
  | 'game_finished'
  | string

export type RoomEvent = {
  type: RoomEventType
  room_id: number | string
  timestamp: string
  data?: unknown
}

type RoomEventListener = (event: RoomEvent) => void

function getWsBaseUrl(rawApiUrl: string): string {
  const normalized = rawApiUrl.replace(/\/+$/, '')
  const withoutApiPrefix = normalized.endsWith('/api/v1') ? normalized.slice(0, -7) : normalized

  if (!withoutApiPrefix) {
    // Same-origin: use current page origin so the Vite proxy (or prod reverse proxy) can forward.
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}`
  }
  if (withoutApiPrefix.startsWith('https://')) {
    return `wss://${withoutApiPrefix.slice('https://'.length)}`
  }
  if (withoutApiPrefix.startsWith('http://')) {
    return `ws://${withoutApiPrefix.slice('http://'.length)}`
  }
  return `ws://${withoutApiPrefix}`
}

export function connectRoomWS(roomId: number, onEvent: RoomEventListener): () => void {
  const wsBaseUrl = getWsBaseUrl(import.meta.env.VITE_API_URL ?? '')
  const wsUrl = `${wsBaseUrl}/api/v1/rooms/${roomId}/ws`

  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let isClosedManually = false

  const connect = () => {
    socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RoomEvent
        if (payload && typeof payload.type === 'string') {
          onEvent(payload)
        }
      } catch {
        // Ignore malformed WS payloads.
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
