package com.onlineshop.scheduler;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.repository.*;
import com.onlineshop.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Equivalent of services/room_manager RoomStarter cron (1s tick).
 *  - For STARTING_SOON rooms whose start_time is in the future: emit
 *    "room_starting" with the live countdown.
 *  - For STARTING_SOON rooms whose start_time has passed: top up missing
 *    seats with available bots (charging entry_cost per bot), then transition
 *    to PLAYING and emit "game_started".
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

    @Scheduled(fixedRateString = "${app.scheduler.room-starter-fixed-rate:1000}")
    @Transactional
    public void tick() {
        Instant now = Instant.now();
        List<Room> arming = roomRepo.findAllByStatus(RoomStatus.STARTING_SOON);
        for (Room r : arming) {
            try {
                if (r.getStartTime() == null) continue;
                if (now.isBefore(r.getStartTime())) {
                    events.publishRoomStarting(r.getRoomId(), r.getStartTime());
                    continue;
                }
                fillWithBotsAndStart(r);
            } catch (Exception e) {
                log.warn("RoomStarter failed for room {}: {}", r.getRoomId(), e.getMessage());
            }
        }
    }

    private void fillWithBotsAndStart(Room room) {
        int needed = (int) (room.getPlayersNeeded() - playerRepo.countByRoomId(room.getRoomId()));
        if (needed > 0) {
            List<User> bots = userRepo.findAvailableBots(room.getEntryCost());
            int filled = 0;
            for (User bot : bots) {
                if (filled >= needed) break;
                if (playerRepo.existsByRoomIdAndUserId(room.getRoomId(), bot.getId())) continue;
                try {
                    users.debit(bot.getId(), room.getEntryCost());
                } catch (Exception e) {
                    continue;
                }
                int placeIndex = placeRepo.findMaxIndexByRoomId(room.getRoomId()).orElse(0) + 1;
                placeRepo.save(RoomPlace.builder()
                        .roomId(room.getRoomId()).userId(bot.getId()).placeIndex(placeIndex).build());
                playerRepo.save(RoomPlayer.builder()
                        .roomId(room.getRoomId()).userId(bot.getId()).placeId(placeIndex).build());
                room.setJackpot(room.getJackpot() + room.getEntryCost());
                events.publishPlayerJoined(room.getRoomId(), bot.getId(), 1);
                filled++;
            }
        }
        room.setStatus(RoomStatus.PLAYING);
        room.setStartTime(Instant.now());
        roomRepo.save(room);
        events.publishGameStarted(room.getRoomId());
    }
}
