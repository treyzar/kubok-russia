package com.onlineshop.events;

import com.fasterxml.jackson.annotation.JsonProperty;

public record BoostAppliedData(
        @JsonProperty("user_id") int userId,
        int amount
) {}
