package com.onlineshop.events;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Publishes RoomEvent instances to Redis pub/sub channels under
 * "room.events.{roomId}". Mirrors the Go events publisher.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    public void publish(String roomId, String type, Map<String, Object> data) {
        try {
            String json = mapper.writeValueAsString(RoomEvent.of(type, roomId, data));
            redis.convertAndSend("room.events." + roomId, json);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialise event {} for room {}", type, roomId, e);
        } catch (Exception e) {
            // Redis unavailability must not break business flow.
            log.warn("Failed to publish event {} for room {}: {}", type, roomId, e.getMessage());
        }
    }
}
