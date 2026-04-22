package com.onlineshop.scheduler;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.repository.RoomRepository;
import com.onlineshop.repository.RoomTemplateRepository;
import com.onlineshop.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Equivalent of services/room_manager RoomFinisher cron (1s tick).
 * Settles PLAYING rooms whose round_duration has elapsed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoomFinisherJob {

    private final RoomRepository roomRepo;
    private final RoomTemplateRepository templateRepo;
    private final RoomService rooms;

    @Scheduled(fixedRateString = "${app.scheduler.room-finisher-fixed-rate:1000}")
    public void tick() {
        Instant now = Instant.now();
        List<Room> playing = roomRepo.findAllByStatus(RoomStatus.PLAYING);
        for (Room r : playing) {
            int duration = 60;
            if (r.getTemplateId() != null) {
                duration = templateRepo.findById(r.getTemplateId())
                        .map(RoomTemplate::getRoundDurationSeconds).orElse(60);
            }
            if (r.getStartTime() == null) continue;
            Instant endsAt = r.getStartTime().plus(Duration.ofSeconds(duration));
            if (!now.isBefore(endsAt)) {
                try {
                    rooms.settle(r.getRoomId());
                } catch (Exception e) {
                    log.warn("Settle failed for room {}: {}", r.getRoomId(), e.getMessage());
                }
            }
        }
    }
}
