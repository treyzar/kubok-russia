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
        Object[] row = (Object[]) em.createNativeQuery("""
                SELECT
                    COALESCE(AVG(real_player_count), 0)::float8 AS avg_real_players_per_room,
                    COALESCE(AVG(rt.entry_cost), 0)::float8     AS avg_entry_cost,
                    COUNT(*)::bigint                            AS total_completed_rooms
                FROM (
                    SELECT r.room_id, r.template_id,
                           (SELECT COUNT(*) FROM room_players p WHERE p.room_id = r.room_id) AS real_player_count
                    FROM rooms r
                    WHERE r.status = 'finished' AND r.created_at >= :since
                ) sub
                LEFT JOIN room_templates rt ON rt.template_id = sub.template_id
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
    public boolean checkDuplicate(TemplateDto dto) {
        return templateRepo.existsDuplicate(
                dto.playersNeeded(), dto.minPlayers(), dto.entryCost(), dto.winnerPct());
    }

    @Transactional(readOnly = true)
    public TemplateStats getTemplateStatistics(int templateId, TimeFilter filter) {
        Instant[] range = parseRange(filter);
        Instant start = range[0], end = range[1];

        Object[] tpl = (Object[]) em.createNativeQuery("""
                SELECT
                    COUNT(*)::int                                                AS completed_rooms,
                    COALESCE(SUM((SELECT COUNT(*) FROM room_players p WHERE p.room_id = r.room_id)), 0)::int AS total_real_players,
                    0::int                                                        AS total_bots,
                    COALESCE(AVG((SELECT COUNT(*) FROM room_players p WHERE p.room_id = r.room_id)), 0)::float8 AS avg_real_players_per_room
                FROM rooms r
                WHERE r.template_id = :tid AND r.status = 'finished'
                  AND r.created_at BETWEEN :start AND :end
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        Object[] win = (Object[]) em.createNativeQuery("""
                SELECT
                    COUNT(*) FILTER (WHERE rw.user_id IS NOT NULL)::int AS real_player_wins,
                    0::int                                              AS bot_wins
                FROM room_winners rw
                JOIN rooms r ON r.room_id = rw.room_id
                WHERE r.template_id = :tid
                  AND rw.won_at BETWEEN :start AND :end
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        Object[] boost = (Object[]) em.createNativeQuery("""
                SELECT
                    COALESCE(SUM(rb.amount), 0)::bigint    AS total_boost_amount,
                    COALESCE(AVG(rb.amount), 0)::float8    AS avg_boost_per_player,
                    COALESCE(SUM(rb.amount) / NULLIF(COUNT(DISTINCT rb.room_id), 0), 0)::float8 AS avg_boost_per_room
                FROM room_boosts rb
                JOIN rooms r ON r.room_id = rb.room_id
                WHERE r.template_id = :tid
                  AND rb.boosted_at BETWEEN :start AND :end
                """)
                .setParameter("tid", templateId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        Number avgPlaces = (Number) em.createNativeQuery("""
                SELECT COALESCE(AVG(c), 0)::float8 FROM (
                    SELECT COUNT(*) AS c FROM room_places p
                    JOIN rooms r ON r.room_id = p.room_id
                    WHERE r.template_id = :tid AND r.created_at BETWEEN :start AND :end
                    GROUP BY p.user_id, p.room_id
                ) x
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

    private Instant[] parseRange(TimeFilter f) {
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
