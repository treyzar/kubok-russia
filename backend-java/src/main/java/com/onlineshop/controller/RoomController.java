package com.onlineshop.controller;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.entity.RoomBoost;
import com.onlineshop.domain.entity.RoomPlayer;
import com.onlineshop.domain.entity.RoomWinner;
import com.onlineshop.dto.RoomDtos.*;
import com.onlineshop.repository.*;
import com.onlineshop.service.EconomicValidator;
import com.onlineshop.service.RoomService;
import com.onlineshop.dto.EconomicValidationResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Mirrors {@code backend/handlers/room_handler.go} REST surface 1:1.
 *
 * Differences vs the prior Java port (now removed):
 *  - {@code POST /rooms/from-template/{id}} removed. Go selects a template via
 *    the {@code template_id} field of {@link CreateRoomRequest}.
 *  - {@code POST /rooms/{id}/places} (claim places) removed — Go ships extra
 *    seats only via {@code places} on the {@code POST /rooms/{id}/players}
 *    (join) request.
 *  - {@code POST /rooms/{id}/settle} removed — Go has no settle HTTP endpoint;
 *    settle is invoked exclusively by the room-finisher cron.
 *  - List endpoints are wrapped with the appropriate root key
 *    ({@code rooms/players/winners/boosts}) to match Go's response envelopes.
 *  - Mutating endpoints (join/leave/boost) return the full updated {@link Room}
 *    object instead of {@code {message:"..."}}.
 *  - {@code POST /rooms/validate} accepts only
 *    {@code {players_needed, entry_cost, winner_pct}} and returns the same
 *    economic-result fields Go does.
 */
@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService rooms;
    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;
    private final RoomPlaceRepository placeRepo;
    private final RoomBoostRepository boostRepo;
    private final RoomWinnerRepository winnerRepo;
    private final EconomicValidator economic;

    @PostMapping
    public Room create(@Valid @RequestBody CreateRoomRequest req) {
        return rooms.create(req);
    }

    @GetMapping
    public Map<String, List<Room>> list() {
        return Map.of("rooms", roomRepo.findAll());
    }

    @GetMapping("/{roomId}")
    public Room get(@PathVariable Integer roomId) {
        return roomRepo.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("room not found"));
    }

    @PostMapping("/validate")
    public ValidateRoomResponse validate(@Valid @RequestBody ValidateRoomRequest req) {
        EconomicValidationResult r = economic.validate(
                req.playersNeeded(), req.entryCost(), req.winnerPct());
        return new ValidateRoomResponse(
                r.prizeFund(), r.organiserCut(), r.playerROI(), r.playerWinProb(), r.warnings());
    }

    // ----- players (room membership) -----

    @PostMapping("/{roomId}/players")
    public Room join(@PathVariable Integer roomId,
                     @Valid @RequestBody JoinRoomRequest req) {
        return rooms.join(roomId, req.userId(), req.places());
    }

    @DeleteMapping("/{roomId}/players")
    public Room leave(@PathVariable Integer roomId,
                      @Valid @RequestBody LeaveRoomRequest req) {
        return rooms.leave(roomId, req.userId());
    }

    @GetMapping("/{roomId}/players")
    public Map<String, List<Map<String, Object>>> listPlayers(@PathVariable Integer roomId) {
        var places = placeRepo.findAllByRoomId(roomId);
        java.util.Map<Integer, Long> placesByUser = new java.util.HashMap<>();
        for (var pl : places) {
            placesByUser.merge(pl.getUserId(), 1L, Long::sum);
        }
        var rows = new java.util.ArrayList<Map<String, Object>>();
        for (RoomPlayer p : playerRepo.findAllByRoomId(roomId)) {
            var row = new java.util.LinkedHashMap<String, Object>();
            row.put("room_id", p.getRoomId());
            row.put("user_id", p.getUserId());
            row.put("place_id", p.getPlaceId());
            row.put("places", placesByUser.getOrDefault(p.getUserId(), 1L).intValue());
            row.put("joined_at", p.getJoinedAt());
            rows.add(row);
        }
        return Map.of("players", rows);
    }

    // ----- winners -----

    @GetMapping("/{roomId}/winners")
    public Map<String, List<RoomWinner>> listWinners(@PathVariable Integer roomId) {
        return Map.of("winners", winnerRepo.findAllByRoomId(roomId));
    }

    @GetMapping("/{roomId}/winners/{userId}")
    public RoomWinner getWinner(@PathVariable Integer roomId, @PathVariable Integer userId) {
        return winnerRepo.findById(new RoomWinner.PK(roomId, userId))
                .orElseThrow(() -> new NoSuchElementException("winner not found"));
    }

    // ----- boosts -----

    @PostMapping("/{roomId}/boosts")
    public Room boost(@PathVariable Integer roomId,
                      @Valid @RequestBody BoostRequest req) {
        return rooms.boost(roomId, req.userId(), req.amount());
    }

    @GetMapping("/{roomId}/boosts")
    public Map<String, List<RoomBoost>> listBoosts(@PathVariable Integer roomId) {
        return Map.of("boosts", boostRepo.findAllByRoomId(roomId));
    }

    @GetMapping("/{roomId}/boosts/calc/probability")
    public Map<String, Object> calcProbability(@PathVariable Integer roomId,
                                                @RequestParam("user_id") Integer userId,
                                                @RequestParam(name = "boost_amount", defaultValue = "0") Double boostAmount) {
        return Map.of("probability",
                rooms.calcBoostProbability(roomId, userId, (int) Math.round(boostAmount)));
    }

    @GetMapping("/{roomId}/boosts/calc/boost")
    public Map<String, Object> calcRequiredBoost(@PathVariable Integer roomId,
                                                  @RequestParam("user_id") Integer userId,
                                                  @RequestParam(name = "desired_probability") Double desiredProbability) {
        return Map.of("boost_amount",
                rooms.calcRequiredBoost(roomId, userId, desiredProbability));
    }
}
