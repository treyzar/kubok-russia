package com.onlineshop.scheduler;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.repository.RoomPlayerRepository;
import com.onlineshop.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Equivalent of services/bot_manager (10s tick).
 * Stub implementation: walks active rooms and emits a debug log line per room
 * with the current real-player count. Replace with real bot strategy as needed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BotManagerJob {

    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;

    @Scheduled(fixedRateString = "${app.scheduler.bot-manager-fixed-rate:10000}")
    public void tick() {
        List<Room> rooms = roomRepo.findAllByStatus(RoomStatus.NEW);
        rooms.addAll(roomRepo.findAllByStatus(RoomStatus.STARTING_SOON));
        for (Room r : rooms) {
            long c = playerRepo.countByRoomId(r.getRoomId());
            log.debug("bot-tick room={} status={} players={}/{}",
                    r.getRoomId(), r.getStatus(), c, r.getPlayersNeeded());
        }
    }
}
