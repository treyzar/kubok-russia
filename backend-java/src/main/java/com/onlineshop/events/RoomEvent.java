package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record RoomEvent(
        String type,
        @JsonProperty("room_id") int roomId,
        Instant timestamp,
        Object data
) {}
