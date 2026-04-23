package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public class AdminDtos {

    public record HistoricalMetrics(double avgRealPlayersPerRoom, double avgEntryCost, long totalRooms) {}

    public record TimeFilter(String period, Instant startTime, Instant endTime) {}

    public record Warning(String field, String message, String severity) {}

    /** Body of POST /admin/templates/validate — matches Go ValidateTemplateRequest. */
    public record AdminValidateTemplateRequest(
            @NotNull @Min(1) Integer playersNeeded,
            @NotNull @Min(1) Integer minPlayers,
            @NotNull @Min(0) Integer entryCost,
            @NotNull @Min(1) @Max(99) Integer winnerPct,
            String gameType
    ) {}

    /** Response of POST /admin/templates/validate — matches Go ValidateTemplateResponse. */
    public record AdminValidateTemplateResponse(
            boolean valid,
            List<Warning> warnings,
            int expectedJackpot,
            boolean isDuplicate
    ) {}

    public record TemplateStatus(int templateId, int activeRooms, int waitingRooms, boolean canDelete) {}

    public record TemplateStats(
            int templateId,
            int completedRooms,
            int totalRealPlayers,
            int totalBots,
            double avgRealPlayersPerRoom,
            int realPlayerWins,
            int botWins,
            long totalBoostAmount,
            double avgBoostPerPlayer,
            double avgBoostPerRoom,
            double avgPlacesPerPlayer
    ) {}

    /** One row of GET /admin/statistics/templates. */
    public record TemplateStatisticsListItem(
            int templateId,
            String name,
            int playersNeeded,
            int minPlayers,
            int maxPlayers,
            int entryCost,
            int winnerPct,
            int roundDurationSeconds,
            int startDelaySeconds,
            GameType gameType,
            Instant createdAt,
            Instant updatedAt,
            Instant deletedAt,
            int completedRooms
    ) {}
}
