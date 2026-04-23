package com.onlineshop.scheduler;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.repository.*;
import com.onlineshop.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Equivalent of services/room_manager RoomStarter cron (1 s tick).
 *  - For STARTING_SOON rooms whose start_time is in the future: emit
 *    "room_starting" with the live countdown.
 *  - For STARTING_SOON rooms whose start_time has passed: top up missing
 *    seats with available bots (charging entry_cost per bot), then transition
 *    to PLAYING and emit "game_started".
 *
 * Mirrors {@code backend/internal/crons/room_starter.go}:
 *  - If we cannot find ENOUGH bots to fill all missing seats, we abort and
 *    retry on the next tick (no partial fill, no status change).
 *  - We do NOT publish {@code player_joined} for bot fills — only the final
 *    {@code game_started} event is emitted.
 *  - {@code start_time} is NOT mutated when transitioning to PLAYING (Go's
 *    {@code SetRoomStatus} only updates {@code status}).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoomStarterJob {

    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;
    private final RoomPlaceRepository placeRepo;
    private final UserRepository userRepo;
    private final UserService users;
    private final EventPublisher events;


    @Autowired @Lazy
    private RoomStarterJob self;

    @Scheduled(fixedRateString = "${app.scheduler.room-starter-fixed-rate:1000}")
    public void tick() {
        Instant now = Instant.now();
        List<Room> arming = self.fetchArmingRooms();
        for (Room r : arming) {
            try {
                if (r.getStartTime() == null) continue;
                if (now.isBefore(r.getStartTime())) {
                    events.publishRoomStarting(r.getRoomId(), r.getStartTime());
                    continue;
                }
                self.fillWithBotsAndStart(r.getRoomId());
            } catch (Exception e) {
                log.warn("RoomStarter failed for room {}: {}", r.getRoomId(), e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Room> fetchArmingRooms() {
        return roomRepo.findAllByStatus(RoomStatus.STARTING_SOON);
    }

    /**
     * Single-transaction bot fill + status transition. If not enough eligible
     * bots are available, the entire transaction is rolled back and the room
     * stays in STARTING_SOON for the next tick to retry.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fillWithBotsAndStart(Integer roomId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow();
        if (room.getStatus() != RoomStatus.STARTING_SOON) return;

        int occupiedPlaces = (int) placeRepo.countByRoomId(roomId);
        int botsNeeded = room.getPlayersNeeded() - occupiedPlaces;
        if (botsNeeded < 0) botsNeeded = 0;

        if (botsNeeded > 0) {
            // Find candidate bots: bot=true AND balance >= entry_cost AND not already in room.
            List<User> candidates = userRepo.findAvailableBots(room.getEntryCost());
            List<User> picked = new ArrayList<>(botsNeeded);
            for (User b : candidates) {
                if (playerRepo.existsByRoomIdAndUserId(roomId, b.getId())) continue;
                picked.add(b);
                if (picked.size() == botsNeeded) break;
            }
            if (picked.size() < botsNeeded) {
                // Not enough bots — abort. Spring will rollback @Transactional via the
                // RuntimeException thrown below.
                log.info("[RoomStarter] Not enough bots for room {} (need {}, found {}); will retry",
                        roomId, botsNeeded, picked.size());
                throw new NotEnoughBotsException();
            }

            for (User bot : picked) {
                users.debit(bot.getId(), room.getEntryCost());
                int placeIndex = placeRepo.findMaxIndexByRoomId(roomId).orElse(0) + 1;
                placeRepo.save(RoomPlace.builder()
                        .roomId(roomId).userId(bot.getId()).placeIndex(placeIndex).build());
                playerRepo.save(RoomPlayer.builder()
                        .roomId(roomId).userId(bot.getId()).placeId(placeIndex).build());
                room.setJackpot(room.getJackpot() + room.getEntryCost());
            }
        }

        room.setStatus(RoomStatus.PLAYING);
        // NB: per Go SetRoomStatus, start_time is not modified here.
        roomRepo.save(room);
        events.publishGameStarted(roomId);
    }

    /** Sentinel exception used to roll back the @Transactional fill. */
    public static class NotEnoughBotsException extends RuntimeException {
        public NotEnoughBotsException() { super("not enough bots to start room"); }
    }
}
