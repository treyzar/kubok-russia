package com.onlineshop.controller;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.dto.AdminDtos.*;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.service.AdminStatsService;
import com.onlineshop.service.TemplateLifecycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Mirrors {@code backend/handlers/admin_handler.go}.
 *
 * Differences vs the prior Java port (now removed):
 *  - {@code POST /admin/templates/economic} and {@code POST /admin/templates/duplicate-check}
 *    are removed (Go has no such endpoints).
 *  - {@code POST /admin/templates/validate} now accepts the same compact body
 *    Go does ({@link AdminValidateTemplateRequest}) and returns the same
 *    {@code {valid, warnings, expected_jackpot, is_duplicate}} envelope, with
 *    the duplicate-marker injected into {@code warnings} as severity=error.
 *  - {@code GET /admin/statistics/templates} now wraps {@code templates: [...]}
 *    of {@link TemplateStatisticsListItem}, supports
 *    {@code period/start_time/end_time/sort_by/sort_order} query parameters
 *    and includes per-template {@code completed_rooms}.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminStatsService stats;
    private final TemplateLifecycleService lifecycle;

    @PostMapping("/templates/validate")
    public AdminValidateTemplateResponse validate(@Valid @RequestBody AdminValidateTemplateRequest req) {
        if (req.minPlayers() > req.playersNeeded()) {
            throw new IllegalArgumentException("min_players cannot be greater than players_needed");
        }
        String gt = req.gameType();
        if (gt != null && !gt.isBlank() && !gt.equals("train") && !gt.equals("fridge")) {
            throw new IllegalArgumentException("game_type must be one of: train, fridge");
        }

        List<Warning> warnings = new ArrayList<>(stats.validateAdminTemplate(req));
        boolean isDuplicate = stats.checkDuplicateAdmin(req);
        if (isDuplicate) {
            warnings.add(new Warning("template",
                    "A template with identical parameters already exists", "error"));
        }

        boolean valid = warnings.stream().noneMatch(w -> "error".equalsIgnoreCase(w.severity()));
        int expectedJackpot = req.playersNeeded() * req.entryCost() * req.winnerPct() / 100;
        return new AdminValidateTemplateResponse(valid, warnings, expectedJackpot, isDuplicate);
    }

    @GetMapping("/statistics/templates")
    public Map<String, List<TemplateStatisticsListItem>> listTemplates(
            @RequestParam(defaultValue = "all") String period,
            @RequestParam(name = "start_time", required = false) Instant startTime,
            @RequestParam(name = "end_time", required = false) Instant endTime,
            @RequestParam(name = "sort_by", defaultValue = "template_id") String sortBy,
            @RequestParam(name = "sort_order", defaultValue = "asc") String sortOrder
    ) {
        TimeFilter filter = new TimeFilter(period, startTime, endTime);
        List<RoomTemplate> all = lifecycle.list();
        List<TemplateStatisticsListItem> items = new ArrayList<>(all.size());
        for (RoomTemplate t : all) {
            TemplateStats s = stats.getTemplateStatistics(t.getTemplateId(), filter);
            items.add(new TemplateStatisticsListItem(
                    t.getTemplateId(),
                    t.getName(),
                    t.getPlayersNeeded(),
                    t.getMinPlayers(),
                    t.getEntryCost(),
                    t.getWinnerPct(),
                    t.getRoundDurationSeconds(),
                    t.getStartDelaySeconds(),
                    t.getGameType(),
                    t.getCreatedAt(),
                    t.getUpdatedAt(),
                    s.completedRooms()
            ));
        }

        Comparator<TemplateStatisticsListItem> cmp = switch (sortBy) {
            case "name"             -> Comparator.comparing(TemplateStatisticsListItem::name);
            case "players_needed"   -> Comparator.comparingInt(TemplateStatisticsListItem::playersNeeded);
            case "min_players"      -> Comparator.comparingInt(TemplateStatisticsListItem::minPlayers);
            case "entry_cost"       -> Comparator.comparingInt(TemplateStatisticsListItem::entryCost);
            case "winner_pct"       -> Comparator.comparingInt(TemplateStatisticsListItem::winnerPct);
            case "game_type"        -> Comparator.comparing(i -> i.gameType().getValue());
            case "completed_rooms"  -> Comparator.comparingInt(TemplateStatisticsListItem::completedRooms);
            case "created_at"       -> Comparator.comparing(TemplateStatisticsListItem::createdAt);
            case "updated_at"       -> Comparator.comparing(TemplateStatisticsListItem::updatedAt);
            default                  -> Comparator.comparingInt(TemplateStatisticsListItem::templateId);
        };
        if ("desc".equalsIgnoreCase(sortOrder)) cmp = cmp.reversed();
        items.sort(cmp);

        return Map.of("templates", items);
    }

    @GetMapping("/statistics/templates/{id}")
    public TemplateStats templateStats(@PathVariable("id") Integer id,
                                       @RequestParam(defaultValue = "all") String period,
                                       @RequestParam(name = "start_time", required = false) Instant start,
                                       @RequestParam(name = "end_time", required = false) Instant end) {
        return stats.getTemplateStatistics(id, new TimeFilter(period, start, end));
    }

    @GetMapping("/templates/{id}/status")
    public TemplateStatus status(@PathVariable Integer id) {
        return lifecycle.getStatus(id);
    }

    @PutMapping("/templates/{id}")
    public RoomTemplate update(@PathVariable Integer id, @Valid @RequestBody TemplateDto dto) {
        return lifecycle.update(id, dto);
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        TemplateStatus s = lifecycle.getStatus(id);
        if (!s.canDelete()) {
            return ResponseEntity.status(409).body(Map.of(
                    "message", String.format("Cannot delete template: %d active rooms and %d waiting rooms exist",
                            s.activeRooms(), s.waitingRooms()),
                    "template_id", s.templateId(),
                    "active_rooms", s.activeRooms(),
                    "waiting_rooms", s.waitingRooms()
            ));
        }
        lifecycle.delete(id);
        return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
    }

    @GetMapping("/metrics/historical")
    public HistoricalMetrics historical() { return stats.getHistoricalMetrics(); }
}
