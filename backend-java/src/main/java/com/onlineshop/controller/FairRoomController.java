package com.onlineshop.controller;

import com.onlineshop.domain.enums.RiskLevel;
import com.onlineshop.dto.CreateFairRoomRequest;
import com.onlineshop.dto.FairRoomDto;
import com.onlineshop.dto.JoinFairRoomRequest;
import com.onlineshop.dto.JoinResultDto;
import com.onlineshop.service.FairRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/fair-rooms")
@RequiredArgsConstructor
public class FairRoomController {

    private final FairRoomService service;

    @PostMapping
    public FairRoomDto create(@Valid @RequestBody CreateFairRoomRequest req) {
        return service.createRoom(req.riskLevel());
    }

    @GetMapping
    public Map<String, List<FairRoomDto>> list(@RequestParam("risk_level") String level) {
        return Map.of("rooms", service.listRooms(RiskLevel.fromValue(level)));
    }

    @GetMapping("/{id}")
    public FairRoomDto get(@PathVariable UUID id) {
        return service.getRoom(id);
    }

    @PostMapping("/{id}/join")
    public JoinResultDto join(@PathVariable UUID id, @Valid @RequestBody JoinFairRoomRequest req) {
        return service.joinRoom(id, req.userId(), req.deposit());
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Map<String, String>> start(@PathVariable UUID id) {
        service.startGame(id);
        return ResponseEntity.ok(Map.of("message", "game started"));
    }
}
