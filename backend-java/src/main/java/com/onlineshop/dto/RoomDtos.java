package com.onlineshop.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public class RoomDtos {

    public record JoinRoomRequest(@NotNull Integer userId) {}

    public record BoostRequest(@NotNull Integer userId,
                               @NotNull @PositiveOrZero BigDecimal amount) {}

    public record ClaimPlaceRequest(@NotNull Integer userId, @NotNull @Min(1) Integer count) {}
}
