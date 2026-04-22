package com.onlineshop.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-room WebSocket fan-out. Sessions are grouped by roomId parsed from the
 * URL path (.../rooms/{roomId}/ws). Bridged from Redis by RoomEventListener.
 */
@Component
@Slf4j
public class RoomWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = extractRoomId(session.getUri());
        if (roomId == null) {
            try { session.close(CloseStatus.BAD_DATA); } catch (IOException ignored) {}
            return;
        }
        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);
        log.info("WS connected room={} sessions={}", roomId, rooms.get(roomId).size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = extractRoomId(session.getUri());
        if (roomId == null) return;
        Set<WebSocketSession> set = rooms.get(roomId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) rooms.remove(roomId);
        }
    }

    public void broadcastToRoom(String roomId, String message) {
        Set<WebSocketSession> set = rooms.get(roomId);
        if (set == null) return;
        TextMessage tm = new TextMessage(message);
        for (WebSocketSession s : set) {
            if (!s.isOpen()) continue;
            try {
                synchronized (s) {
                    s.sendMessage(tm);
                }
            } catch (IOException e) {
                log.warn("WS send failed room={} sessId={}: {}", roomId, s.getId(), e.getMessage());
            }
        }
    }

    private String extractRoomId(URI uri) {
        if (uri == null) return null;
        String path = uri.getPath();
        // expected: /api/v1/rooms/{roomId}/ws
        int idx = path.indexOf("/rooms/");
        if (idx < 0) return null;
        String tail = path.substring(idx + "/rooms/".length());
        int slash = tail.indexOf('/');
        return slash > 0 ? tail.substring(0, slash) : tail;
    }
}
