package com.onlineshop.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Publishes RoomEvent instances to Redis pub/sub channels under "room:{roomId}".
 * Mirrors backend/internal/events/publisher.go (channel format `room:%d`,
 * typed payloads with snake_case fields).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    private void publish(int roomId, String type, Object data) {
        try {
            String json = mapper.writeValueAsString(
                    new RoomEvent(type, roomId, Instant.now(), data));
            redis.convertAndSend("room:" + roomId, json);
        } catch (Exception e) {
            log.warn("Failed to publish {} for room {}: {}", type, roomId, e.getMessage());
        }
    }

    public void publishPlayerJoined(int roomId, int userId, int places) {
        publish(roomId, "player_joined", new PlayerJoinedData(userId, places));
    }

    public void publishBoostApplied(int roomId, int userId, int amount) {
        publish(roomId, "boost_applied", new BoostAppliedData(userId, amount));
    }

    public void publishRoomStarting(int roomId, Instant startTime) {
        long countdown = Math.max(0, Duration.between(Instant.now(), startTime).getSeconds());
        publish(roomId, "room_starting", new RoomStartingData(startTime, (int) countdown));
    }

    public void publishGameStarted(int roomId) {
        publish(roomId, "game_started", null);
    }

    public void publishGameFinished(int roomId, int winnerId, int prize) {
        publish(roomId, "game_finished", new GameFinishedData(winnerId, prize));
    }

    /**
     * Generic publisher for non-numeric room ids (e.g. UUID-keyed fair rooms).
     * Channel format: "room:{roomId}". Payload data is serialised as-is.
     */
    public void publish(String roomId, String type, Object data) {
        try {
            var envelope = new java.util.LinkedHashMap<String, Object>();
            envelope.put("type", type);
            envelope.put("room_id", roomId);
            envelope.put("timestamp", Instant.now());
            if (data != null) envelope.put("data", data);
            String json = mapper.writeValueAsString(envelope);
            redis.convertAndSend("room:" + roomId, json);
        } catch (Exception e) {
            log.warn("Failed to publish {} for room {}: {}", type, roomId, e.getMessage());
        }
    }
}
