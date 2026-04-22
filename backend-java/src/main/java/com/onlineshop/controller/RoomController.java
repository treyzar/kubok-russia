package com.onlineshop.controller;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.entity.RoomBoost;
import com.onlineshop.domain.entity.RoomPlayer;
import com.onlineshop.domain.entity.RoomWinner;
import com.onlineshop.dto.EconomicValidationResult;
import com.onlineshop.dto.RoomDtos.*;
import com.onlineshop.repository.*;
import com.onlineshop.service.EconomicValidator;
import com.onlineshop.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService rooms;
    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;
    private final RoomBoostRepository boostRepo;
    private final RoomWinnerRepository winnerRepo;
    private final EconomicValidator economic;

    @PostMapping("/from-template/{templateId}")
    public Room createFromTemplate(@PathVariable Integer templateId) {
        return rooms.createFromTemplate(templateId);
    }

    @PostMapping
    public Room create(@Valid @RequestBody CreateRoomRequest r) {
        return rooms.createDirect(r.playersNeeded(), r.minPlayers(), r.entryCost(),
                r.winnerPct(), r.roundDurationSeconds(), r.startDelaySeconds(), r.gameType());
    }

    @GetMapping
    public List<Room> list() { return roomRepo.findAll(); }

    @GetMapping("/{roomId}")
    public Room get(@PathVariable Integer roomId) {
        return roomRepo.findById(roomId).orElseThrow();
    }

    @PostMapping("/validate")
    public EconomicValidationResult validate(@Valid @RequestBody CreateRoomRequest r) {
        return economic.validate(r.playersNeeded(), r.entryCost(), r.winnerPct());
    }

    // ----- players (room membership) -----

    @PostMapping("/{roomId}/players")
    public ResponseEntity<Map<String, String>> join(@PathVariable Integer roomId,
                                                    @Valid @RequestBody JoinRoomRequest req) {
        rooms.join(roomId, req.userId());
        return ResponseEntity.ok(Map.of("message", "joined"));
    }

    @DeleteMapping("/{roomId}/players")
    public ResponseEntity<Map<String, String>> leave(@PathVariable Integer roomId,
                                                     @Valid @RequestBody LeaveRoomRequest req) {
        rooms.leave(roomId, req.userId());
        return ResponseEntity.ok(Map.of("message", "left"));
    }

    @GetMapping("/{roomId}/players")
    public List<RoomPlayer> listPlayers(@PathVariable Integer roomId) {
        return playerRepo.findAllByRoomId(roomId);
    }

    // ----- winners -----

    @GetMapping("/{roomId}/winners")
    public List<RoomWinner> listWinners(@PathVariable Integer roomId) {
        return winnerRepo.findAllByRoomId(roomId);
    }

    @GetMapping("/{roomId}/winners/{userId}")
    public RoomWinner getWinner(@PathVariable Integer roomId, @PathVariable Integer userId) {
        return winnerRepo.findById(new RoomWinner.PK(roomId, userId)).orElseThrow();
    }

    // ----- boosts -----

    @PostMapping("/{roomId}/boosts")
    public ResponseEntity<Map<String, String>> boost(@PathVariable Integer roomId,
                                                     @Valid @RequestBody BoostRequest req) {
        rooms.boost(roomId, req.userId(), req.amount());
        return ResponseEntity.ok(Map.of("message", "boosted"));
    }

    @GetMapping("/{roomId}/boosts")
    public List<RoomBoost> listBoosts(@PathVariable Integer roomId) {
        return boostRepo.findAllByRoomId(roomId);
    }

    @GetMapping("/{roomId}/boosts/calc/probability")
    public Map<String, Object> calcProbability(@PathVariable Integer roomId,
                                                @RequestParam Integer userId,
                                                @RequestParam(defaultValue = "0") Integer boost) {
        return Map.of("probability", rooms.calcBoostProbability(roomId, userId, boost));
    }

    @GetMapping("/{roomId}/boosts/calc/boost")
    public Map<String, Object> calcRequiredBoost(@PathVariable Integer roomId,
                                                  @RequestParam Integer userId,
                                                  @RequestParam Double probability) {
        return Map.of("boost", rooms.calcRequiredBoost(roomId, userId, probability));
    }

    // ----- places -----

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
