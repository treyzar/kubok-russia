package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class RoomDtos {

    public record JoinRoomRequest(@NotNull Integer userId) {}

    public record LeaveRoomRequest(@NotNull Integer userId) {}

    public record BoostRequest(@NotNull Integer userId, @NotNull @Positive Integer amount) {}

    public record ClaimPlaceRequest(@NotNull Integer userId, @NotNull @Min(1) Integer count) {}

    public record CreateRoomRequest(
            @NotNull @Min(1) Integer playersNeeded,
            @NotNull @Min(1) Integer minPlayers,
            @NotNull @Positive Integer entryCost,
            @NotNull @Min(1) Integer winnerPct,
            @NotNull @Min(10) Integer roundDurationSeconds,
            @NotNull @Min(5) Integer startDelaySeconds,
            @NotNull GameType gameType
    ) {}

    public record BalancePatchRequest(@NotNull Integer delta) {}

    public record BalanceSetRequest(@NotNull @Min(0) Integer balance) {}

    public record BalanceMoveRequest(@NotNull @Positive Integer amount) {}
}
