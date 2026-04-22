package com.onlineshop.controller;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.service.TemplateLifecycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Mirrors backend/handlers/template_handler.go (CRUD path /room-templates).
 */
@RestController
@RequestMapping("/api/v1/room-templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateLifecycleService lifecycle;

    @PostMapping
    public RoomTemplate create(@Valid @RequestBody TemplateDto dto) { return lifecycle.create(dto); }

    @GetMapping
    public List<RoomTemplate> list() { return lifecycle.list(); }

    @GetMapping("/{id}")
    public RoomTemplate get(@PathVariable("id") Integer id) { return lifecycle.get(id); }

    @PutMapping("/{id}")
    public RoomTemplate update(@PathVariable("id") Integer id, @Valid @RequestBody TemplateDto dto) {
        return lifecycle.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable("id") Integer id) {
        lifecycle.delete(id);
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }
}
