package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PlayerJoinedData(
        @JsonProperty("user_id") int userId,
        int places
) {}
