package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public record RoomStartingData(
        @JsonProperty("start_time") Instant startTime,
        @JsonProperty("countdown_seconds") int countdownSeconds
) {}
