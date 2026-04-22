package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;

public class RoomDtos {

    /** POST /rooms/{id}/players — supports optional `places` (>=1, default 1). */
    public record JoinRoomRequest(
            @NotNull Integer userId,
            @Min(1) Integer places
    ) {}

    public record LeaveRoomRequest(@NotNull Integer userId) {}

    public record BoostRequest(@NotNull Integer userId, @NotNull @Positive Integer amount) {}

    /**
     * POST /rooms — mirrors Go CreateRoomRequest body.
     * If `templateId` is set, the server pulls
     * players_needed/entry_cost/winner_pct/round_duration/start_delay/game_type/min_players
     * from the template; otherwise per-field defaults match Go
     * (min_players=1, winner_pct=80, round_duration=30, start_delay=60, game_type=train).
     */
    public record CreateRoomRequest(
            Integer templateId,
            Integer jackpot,
            Instant startTime,
            String status,
            @NotNull @Min(1) Integer playersNeeded,
            @Min(1) Integer minPlayers,
            @NotNull @Min(0) Integer entryCost,
            @Min(1) @Max(99) Integer winnerPct,
            @Min(10) @Max(3600) Integer roundDurationSeconds,
            @Min(5) @Max(600) Integer startDelaySeconds,
            String gameType
    ) {}

    /** POST /rooms/validate — only three fields. */
    public record ValidateRoomRequest(
            @NotNull @Min(1) Integer playersNeeded,
            @NotNull @Min(0) Integer entryCost,
            @NotNull @Min(1) @Max(99) Integer winnerPct
    ) {}

    public record BalancePatchRequest(@NotNull Integer delta) {}
    public record BalanceSetRequest(@NotNull @Min(0) Integer balance) {}
    public record BalanceMoveRequest(@NotNull @Positive Integer amount) {}

    /** Response shape mirroring Go ValidateRoomResponse. */
    public record ValidateRoomResponse(
            int prizeFund,
            int organiserCut,
            double playerRoi,
            double playerWinProbability,
            java.util.List<String> warnings
    ) {}

    /** GameType helper accepting nullable input. */
    public static GameType parseGameType(String s) {
        if (s == null || s.isBlank()) return GameType.TRAIN;
        return GameType.fromValue(s);
    }
}
