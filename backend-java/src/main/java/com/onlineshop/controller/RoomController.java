package com.onlineshop.controller;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.dto.RoomDtos.*;
import com.onlineshop.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService rooms;

    @PostMapping("/from-template/{templateId}")
    public Room create(@PathVariable Integer templateId) {
        return rooms.createFromTemplate(templateId);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<Map<String, String>> join(@PathVariable Integer roomId,
                                                     @Valid @RequestBody JoinRoomRequest req) {
        rooms.join(roomId, req.userId());
        return ResponseEntity.ok(Map.of("message", "joined"));
    }

    @PostMapping("/{roomId}/boost")
    public ResponseEntity<Map<String, String>> boost(@PathVariable Integer roomId,
                                                      @Valid @RequestBody BoostRequest req) {
        rooms.boost(roomId, req.userId(), req.amount());
        return ResponseEntity.ok(Map.of("message", "boosted"));
    }

    @PostMapping("/{roomId}/places")
    public ResponseEntity<Map<String, String>> claimPlaces(@PathVariable Integer roomId,
                                                            @Valid @RequestBody ClaimPlaceRequest req) {
        rooms.claimPlaces(roomId, req.userId(), req.count());
        return ResponseEntity.ok(Map.of("message", "places_claimed"));
    }

    @PostMapping("/{roomId}/settle")
    public ResponseEntity<Map<String, String>> settle(@PathVariable Integer roomId) {
        rooms.settle(roomId);
        return ResponseEntity.ok(Map.of("message", "settled"));
    }
}
