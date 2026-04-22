package com.onlineshop.controller;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Mirrors backend/handlers/round_handler.go endpoints.
 * /rounds returns finished rooms summary; /rounds/{id} and /rounds/{id}/details
 * return per-round detail.
 */
@RestController
@RequestMapping("/api/v1/rounds")
@RequiredArgsConstructor
public class RoundController {

    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;
    private final RoomBoostRepository boostRepo;
    private final RoomWinnerRepository winnerRepo;

    @GetMapping
    public Map<String, List<Map<String, Object>>> list() {
        List<Room> finished = roomRepo.findAllByStatus(RoomStatus.FINISHED);
        List<Map<String, Object>> out = new ArrayList<>(finished.size());
        for (Room r : finished) out.add(assemble(r));
        return Map.of("rounds", out);
    }

    @GetMapping("/{roomId}")
    public Map<String, Object> get(@PathVariable Integer roomId) {
        Room r = roomRepo.findById(roomId)
                .filter(x -> x.getStatus() == RoomStatus.FINISHED)
                .orElseThrow(() -> new NoSuchElementException("round not found"));
        return assemble(r);
    }

    @GetMapping("/{roomId}/details")
    public Map<String, Object> details(@PathVariable Integer roomId) { return get(roomId); }

    private Map<String, Object> assemble(Room room) {
        List<RoomPlayer> players = playerRepo.findAllByRoomId(room.getRoomId());
        List<RoomBoost> boosts = boostRepo.findAllByRoomId(room.getRoomId());
        List<RoomWinner> winners = winnerRepo.findAllByRoomId(room.getRoomId());

        Map<String, Object> detail = new java.util.LinkedHashMap<>();
        detail.put("room_id", room.getRoomId());
        detail.put("jackpot", room.getJackpot());
        detail.put("entry_cost", room.getEntryCost());
        detail.put("players_needed", room.getPlayersNeeded());
        detail.put("winner_pct", room.getWinnerPct());
        Instant st = room.getStartTime();
        if (st != null) detail.put("start_time", st);
        detail.put("players", players.stream()
                .map(p -> Map.of("user_id", p.getUserId(), "joined_at", p.getJoinedAt())).toList());
        detail.put("boosts", boosts.stream()
                .map(b -> Map.of("user_id", b.getUserId(), "amount", b.getAmount())).toList());
        if (!winners.isEmpty()) {
            RoomWinner w = winners.get(0);
            detail.put("winner", Map.of(
                    "user_id", w.getUserId(),
                    "prize", w.getPrize(),
                    "won_at", w.getWonAt()));
        }
        return detail;
    }
}
