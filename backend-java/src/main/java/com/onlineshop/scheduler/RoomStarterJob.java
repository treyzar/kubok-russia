package com.onlineshop.scheduler;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Equivalent of services/room_manager RoomStarter cron (1s tick).
 * Promotes STARTING_SOON rooms whose start_time has passed to PLAYING.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoomStarterJob {

    private final RoomRepository roomRepo;
    private final EventPublisher events;

    @Scheduled(fixedRateString = "${app.scheduler.room-starter-fixed-rate:1000}")
    @Transactional
    public void tick() {
        List<Room> ready = roomRepo.findReadyToStart(RoomStatus.STARTING_SOON, Instant.now());
        for (Room r : ready) {
            r.setStatus(RoomStatus.PLAYING);
            roomRepo.save(r);
            events.publish(r.getRoomId().toString(), "game_started",
                    Map.of("started_at", Instant.now()));
        }
    }
}
