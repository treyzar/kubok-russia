package com.onlineshop.dto;

import java.time.Instant;
import java.util.List;

public class AdminDtos {

    public record HistoricalMetrics(double avgRealPlayersPerRoom, double avgEntryCost, long totalRooms) {}

    public record TimeFilter(String period, Instant startTime, Instant endTime) {}

    public record Warning(String field, String message, String severity) {}

    public record TemplateValidationResponse(List<Warning> warnings) {}

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
}
