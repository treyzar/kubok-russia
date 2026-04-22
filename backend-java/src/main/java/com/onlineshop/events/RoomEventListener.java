package com.onlineshop.events;

import com.onlineshop.websocket.RoomWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * Bridges Redis pub/sub messages from "room.events.{roomId}" to all
 * WebSocket sessions subscribed to that room.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoomEventListener implements MessageListener {

    private final RoomWebSocketHandler wsHandler;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String body = new String(message.getBody());
        String roomId = channel.substring("room.events.".length());
        wsHandler.broadcastToRoom(roomId, body);
    }
}
