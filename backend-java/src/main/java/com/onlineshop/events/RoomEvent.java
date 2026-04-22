package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Generic room event payload. Mirrors the Go events publisher format.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RoomEvent(
        String type,
        String roomId,
        Instant timestamp,
        Map<String, Object> data
) {
    public static RoomEvent of(String type, String roomId, Map<String, Object> data) {
        return new RoomEvent(type, roomId, Instant.now(), data);
    }
}
