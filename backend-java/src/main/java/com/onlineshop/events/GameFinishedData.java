package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GameFinishedData(
        @JsonProperty("winner_id") int winnerId,
        int prize
) {}
