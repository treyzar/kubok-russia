package com.onlineshop.controller;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.dto.AdminDtos.*;
import com.onlineshop.dto.EconomicValidationResult;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.service.AdminStatsService;
import com.onlineshop.service.EconomicValidator;
import com.onlineshop.service.TemplateLifecycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminStatsService stats;
    private final TemplateLifecycleService lifecycle;
    private final EconomicValidator economic;

    @PostMapping("/templates/validate")
    public TemplateValidationResponse validate(@Valid @RequestBody TemplateDto dto) {
        return new TemplateValidationResponse(stats.validateTemplate(dto));
    }

    @PostMapping("/templates/economic")
    public EconomicValidationResult economic(@Valid @RequestBody TemplateDto dto) {
        return economic.validate(dto.playersNeeded(), dto.entryCost(), dto.winnerPct());
    }

    @PostMapping("/templates/duplicate-check")
    public Map<String, Boolean> duplicate(@Valid @RequestBody TemplateDto dto) {
        return Map.of("exists", stats.checkDuplicate(dto));
    }

    @GetMapping("/statistics/templates")
    public Map<String, List<RoomTemplate>> listTemplates() {
        return Map.of("templates", lifecycle.list());
    }

    @GetMapping("/statistics/templates/{id}")
    public TemplateStats templateStats(@PathVariable("id") Integer id,
                                       @RequestParam(defaultValue = "all") String period,
                                       @RequestParam(required = false) Instant start,
                                       @RequestParam(required = false) Instant end) {
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
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        lifecycle.delete(id);
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }

    @GetMapping("/metrics/historical")
    public HistoricalMetrics historical() { return stats.getHistoricalMetrics(); }
}
