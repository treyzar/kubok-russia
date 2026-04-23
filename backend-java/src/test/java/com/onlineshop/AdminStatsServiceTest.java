package com.onlineshop;

import com.onlineshop.domain.enums.GameType;
import com.onlineshop.dto.AdminDtos.HistoricalMetrics;
import com.onlineshop.dto.AdminDtos.TimeFilter;
import com.onlineshop.dto.AdminDtos.Warning;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.service.AdminStatsService;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Java port of backend/internal/service/admin_stats_service_test.go.
 * Tests the pure validation and time-filter helpers without a database.
 */
class AdminStatsServiceTest {

    private static TemplateDto tpl(int playersNeeded, int minPlayers, int entryCost, int winnerPct) {
        return new TemplateDto("t", playersNeeded, minPlayers, playersNeeded, entryCost, winnerPct, 60, 10, GameType.TRAIN);
    }

    private static HistoricalMetrics standardMetrics() {
        return new HistoricalMetrics(5.0, 100.0, 10);
    }

    private static boolean has(List<Warning> ws, String field) {
        return ws.stream().anyMatch(w -> w.field().equals(field) && w.severity().equals("warning"));
    }

    @Test
    void validate_maxPlayersOne_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(1, 1, 100, 70), standardMetrics());
        assertTrue(has(ws, "players_needed"), "expected players_needed warning");
    }

    @Test
    void validate_minPlayersTooHigh_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(10, 8, 100, 70), standardMetrics());
        assertTrue(has(ws, "min_players"));
    }

    @Test
    void validate_entryCostTooHigh_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(5, 3, 200, 70), standardMetrics());
        assertTrue(has(ws, "entry_cost"));
    }

    @Test
    void validate_entryCostTooLow_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(5, 3, 40, 70), standardMetrics());
        assertTrue(has(ws, "entry_cost"));
    }

    @Test
    void validate_winnerPctTooHigh_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(5, 3, 100, 85), standardMetrics());
        assertTrue(has(ws, "winner_pct"));
    }

    @Test
    void validate_winnerPctTooLow_emitsWarning() {
        var ws = AdminStatsService.validateWithMetrics(tpl(5, 3, 100, 40), standardMetrics());
        assertTrue(has(ws, "winner_pct"));
    }

    @Test
    void parseTimeFilter_hour() {
        Instant[] r = AdminStatsService.parseRange(new TimeFilter("hour", null, null));
        Duration d = Duration.between(r[0], r[1]);
        assertTrue(Math.abs(d.toMillis() - Duration.ofHours(1).toMillis()) < 1500,
                "expected ~1h, got " + d);
    }

    @Test
    void parseTimeFilter_day() {
        Instant[] r = AdminStatsService.parseRange(new TimeFilter("day", null, null));
        Duration d = Duration.between(r[0], r[1]);
        assertTrue(Math.abs(d.toMillis() - Duration.ofDays(1).toMillis()) < 1500);
    }

    @Test
    void parseTimeFilter_week() {
        Instant[] r = AdminStatsService.parseRange(new TimeFilter("week", null, null));
        Duration d = Duration.between(r[0], r[1]);
        assertTrue(Math.abs(d.toMillis() - Duration.ofDays(7).toMillis()) < 1500);
    }

    @Test
    void parseTimeFilter_custom() {
        Instant s = Instant.parse("2024-01-01T00:00:00Z");
        Instant e = Instant.parse("2024-01-31T23:59:59Z");
        Instant[] r = AdminStatsService.parseRange(new TimeFilter("custom", s, e));
        assertEquals(s, r[0]);
        assertEquals(e, r[1]);
    }
}
