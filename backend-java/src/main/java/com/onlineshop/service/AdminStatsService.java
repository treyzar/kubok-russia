package com.onlineshop.service;

import com.onlineshop.dto.AdminDtos.*;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.repository.RoomTemplateRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Java port of internal/service/AdminStatsService.
 *
 * Aggregations use native SQL since the underlying queries are relatively
 * complex; this matches the sqlc-generated query layer in Go.
 */
@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final RoomTemplateRepository templateRepo;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public HistoricalMetrics getHistoricalMetrics() {
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        // Mirrors Go GetHistoricalMetrics in repository/admin.sql.go: real-player count
        // EXCLUDES bots via JOIN users + FILTER (WHERE u.bot = false).
        Object[] row = (Object[]) em.createNativeQuery("""
                WITH completed_rooms AS (
                    SELECT
                        r.room_id,
                        r.entry_cost,
                        COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false) AS real_players
                    FROM rooms r
                    LEFT JOIN room_players rp ON r.room_id = rp.room_id
                    LEFT JOIN users u ON rp.user_id = u.id
                    WHERE r.status = 'finished'
                      AND r.created_at >= :since
                    GROUP BY r.room_id, r.entry_cost
                )
                SELECT
                    COALESCE(AVG(real_players), 0)::float8 AS avg_real_players_per_room,
                    COALESCE(AVG(entry_cost), 0)::float8   AS avg_entry_cost,
                    COUNT(*)::bigint                       AS total_completed_rooms
                FROM completed_rooms
                """)
                .setParameter("since", since)
                .getSingleResult();

        return new HistoricalMetrics(
                ((Number) row[0]).doubleValue(),
                ((Number) row[1]).doubleValue(),
                ((Number) row[2]).longValue());
    }

    @Transactional(readOnly = true)
    public List<Warning> validateTemplate(TemplateDto dto) {
        return validateWithMetrics(dto, getHistoricalMetrics());
    }

    /** Pure function — extracted so it is unit-testable without a database. */
    public static List<Warning> validateWithMetrics(TemplateDto dto, HistoricalMetrics m) {
        List<Warning> w = new ArrayList<>();

        if (dto.playersNeeded() == 1)
            w.add(new Warning("players_needed", "Player count is too low (1 player)", "warning"));
        if (m.avgRealPlayersPerRoom() > 0 && dto.minPlayers() > m.avgRealPlayersPerRoom())
            w.add(new Warning("min_players", "Minimum players exceeds average real player count per room from past week", "warning"));
        if (m.avgRealPlayersPerRoom() > 0 && dto.playersNeeded() > 2 * m.avgRealPlayersPerRoom())
            w.add(new Warning("players_needed", "Maximum players exceeds twice the average real player count per room from past week", "warning"));
        if (m.avgEntryCost() > 0 && dto.entryCost() > 1.75 * m.avgEntryCost())
            w.add(new Warning("entry_cost", "Entry cost is too high (exceeds 1.75x average)", "warning"));
        if (m.avgEntryCost() > 0 && dto.entryCost() < 0.5 * m.avgEntryCost())
            w.add(new Warning("entry_cost", "Entry cost is too low (less than 0.5x average)", "warning"));
        if (dto.winnerPct() > 80)
            w.add(new Warning("winner_pct", "Jackpot percentage is too high (exceeds 80%)", "warning"));
        if (dto.winnerPct() < 50)
            w.add(new Warning("winner_pct", "Jackpot percentage is too low (less than 50%)", "warning"));
        return w;
    }

    @Transactional(readOnly = true)
    public boolean checkDuplicate(TemplateDto dto) {
        return templateRepo.existsDuplicate(
                dto.maxPlayers(), dto.minPlayers(), dto.entryCost(), dto.winnerPct(),
                dto.effectiveGameType());
    }

    /**
     * Mirrors Go {@code AdminStatsService.ValidateTemplate}:
     * uses only the 5 fields available on the admin payload (no name/round/delay).
     */
    @Transactional(readOnly = true)
    public List<Warning> validateAdminTemplate(AdminValidateTemplateRequest dto) {
        HistoricalMetrics m = getHistoricalMetrics();
        List<Warning> w = new ArrayList<>();

        if (dto.playersNeeded() == 1)
            w.add(new Warning("players_needed", "Player count is too low (1 player)", "warning"));
        if (m.avgRealPlayersPerRoom() > 0 && dto.minPlayers() > m.avgRealPlayersPerRoom())
            w.add(new Warning("min_players", "Minimum players exceeds average real player count per room from past week", "warning"));
        if (m.avgRealPlayersPerRoom() > 0 && dto.playersNeeded() > 2 * m.avgRealPlayersPerRoom())
            w.add(new Warning("players_needed", "Maximum players exceeds twice the average real player count per room from past week", "warning"));
        if (m.avgEntryCost() > 0 && dto.entryCost() > 1.75 * m.avgEntryCost())
            w.add(new Warning("entry_cost", "Entry cost is too high (exceeds 1.75x average)", "warning"));
        if (m.avgEntryCost() > 0 && dto.entryCost() < 0.5 * m.avgEntryCost())
            w.add(new Warning("entry_cost", "Entry cost is too low (less than 0.5x average)", "warning"));
        if (dto.winnerPct() > 80)
            w.add(new Warning("winner_pct", "Jackpot percentage is too high (exceeds 80%)", "warning"));
        if (dto.winnerPct() < 50)
            w.add(new Warning("winner_pct", "Jackpot percentage is too low (less than 50%)", "warning"));
        return w;
    }

    @Transactional(readOnly = true)
    public boolean checkDuplicateAdmin(AdminValidateTemplateRequest dto) {
        com.onlineshop.domain.enums.GameType gt = dto.gameType() == null || dto.gameType().isBlank()
                ? com.onlineshop.domain.enums.GameType.FRIDGE
                : com.onlineshop.domain.enums.GameType.fromValue(dto.gameType());
        return templateRepo.existsDuplicate(
                dto.playersNeeded(), dto.minPlayers(), dto.entryCost(), dto.winnerPct(), gt);
    }

    @Transactional(readOnly = true)
    public TemplateStats getTemplateStatistics(int templateId, TimeFilter filter) {
        Instant[] range = parseRange(filter);
        Instant start = range[0], end = range[1];

        // Mirrors Go GetTemplateStatistics: includes users JOIN with bot=false / bot=true filters.
        Object[] tpl = (Object[]) em.createNativeQuery("""
                WITH template_rooms AS (
                    SELECT r.room_id
                    FROM rooms r
                    WHERE r.template_id = :tid
                      AND r.status = 'finished'
                      AND r.created_at >= :start
                      AND r.created_at <= :end
                )
                SELECT
                    COUNT(DISTINCT tr.room_id)::int AS completed_rooms,
                    COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false)::int AS total_real_players,
                    COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = true)::int  AS total_bots,
                    COALESCE(
                        COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false)::float8 /
                        NULLIF(COUNT(DISTINCT tr.room_id), 0),
                        0
                    )::float8 AS avg_real_players_per_room
                FROM template_rooms tr
                LEFT JOIN room_players rp ON tr.room_id = rp.room_id
                LEFT JOIN users u ON rp.user_id = u.id
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        // Mirrors Go GetWinnerStatistics: split real/bot wins via users.bot.
        Object[] win = (Object[]) em.createNativeQuery("""
                SELECT
                    COUNT(*) FILTER (WHERE u.bot = false)::int AS real_player_wins,
                    COUNT(*) FILTER (WHERE u.bot = true)::int  AS bot_wins
                FROM room_winners rw
                INNER JOIN users u ON rw.user_id = u.id
                INNER JOIN rooms r ON r.room_id = rw.room_id
                WHERE r.template_id = :tid
                  AND rw.won_at >= :start AND rw.won_at <= :end
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        // Mirrors Go GetBoostStatistics: per-player avg = SUM/COUNT(DISTINCT user), not AVG(amount).
        Object[] boost = (Object[]) em.createNativeQuery("""
                WITH boost_data AS (
                    SELECT
                        SUM(rb.amount)::bigint AS total_boost_amount,
                        COUNT(DISTINCT rb.user_id)::int AS total_players,
                        COUNT(DISTINCT rb.room_id)::int AS total_rooms
                    FROM room_boosts rb
                    INNER JOIN rooms r ON rb.room_id = r.room_id
                    WHERE r.template_id = :tid
                      AND rb.boosted_at >= :start AND rb.boosted_at <= :end
                )
                SELECT
                    COALESCE(total_boost_amount, 0)::bigint AS total_boost_amount,
                    COALESCE(total_boost_amount::float8 / NULLIF(total_players, 0), 0)::float8 AS avg_boost_per_player,
                    COALESCE(total_boost_amount::float8 / NULLIF(total_rooms, 0), 0)::float8   AS avg_boost_per_room
                FROM boost_data
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        // Mirrors Go GetPlaceStatistics: total_places / DISTINCT players (not avg per group).
        Number avgPlaces = (Number) em.createNativeQuery("""
                WITH place_data AS (
                    SELECT
                        COUNT(*)::int AS total_places,
                        COUNT(DISTINCT rpl.user_id)::int AS total_players
                    FROM room_places rpl
                    INNER JOIN rooms r ON rpl.room_id = r.room_id
                    WHERE r.template_id = :tid
                      AND rpl.created_at >= :start AND rpl.created_at <= :end
                )
                SELECT COALESCE(total_places::float8 / NULLIF(total_players, 0), 0)::float8
                FROM place_data
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        return new TemplateStats(
                templateId,
                ((Number) tpl[0]).intValue(),
                ((Number) tpl[1]).intValue(),
                ((Number) tpl[2]).intValue(),
                ((Number) tpl[3]).doubleValue(),
                ((Number) win[0]).intValue(),
                ((Number) win[1]).intValue(),
                ((Number) boost[0]).longValue(),
                ((Number) boost[1]).doubleValue(),
                ((Number) boost[2]).doubleValue(),
                avgPlaces.doubleValue());
    }

    public static Instant[] parseRange(TimeFilter f) {
        Instant now = Instant.now();
        Instant start, end;
        String period = f == null || f.period() == null ? "all" : f.period();
        switch (period) {
            case "hour"  -> { start = now.minus(1, ChronoUnit.HOURS); end = now; }
            case "day"   -> { start = now.minus(1, ChronoUnit.DAYS); end = now; }
            case "week"  -> { start = now.minus(7, ChronoUnit.DAYS); end = now; }
            case "month" -> { start = now.minus(30, ChronoUnit.DAYS); end = now; }
            case "custom" -> {
                start = f.startTime() != null ? f.startTime() : Instant.parse("2000-01-01T00:00:00Z");
                end = f.endTime() != null ? f.endTime() : now;
            }
            default -> { start = Instant.parse("2000-01-01T00:00:00Z"); end = now; }
        }
        return new Instant[]{start, end};
    }

    /** Convenience: BigDecimal helper for numeric coercion. */
    @SuppressWarnings("unused")
    private static double toDouble(Object o) {
        if (o instanceof BigDecimal b) return b.doubleValue();
        if (o instanceof Number n) return n.doubleValue();
        return 0.0;
    }
}
