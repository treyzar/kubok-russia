package com.onlineshop.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.UUID;

public record JoinFairRoomRequest(
        @NotNull UUID userId,
        @NotNull @PositiveOrZero BigDecimal deposit) {}
