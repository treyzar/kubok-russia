package com.onlineshop.config;

import com.onlineshop.domain.enums.GameType;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.dto.RoomDtos.CreateRoomRequest;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.repository.RoomRepository;
import com.onlineshop.repository.RoomTemplateRepository;
import com.onlineshop.service.TemplateLifecycleService;
import com.onlineshop.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    private final RoomTemplateRepository templateRepo;
    private final RoomRepository roomRepo;
    private final TemplateLifecycleService templates;
    private final RoomService rooms;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        try {
            if (templateRepo.count() == 0) {
                log.info("[DataSeeder] No templates found — seeding default \"Ночной жор\" template.");
                templates.create(new TemplateDto(
                        "Ночной жор",
                        10,    // playersNeeded
                        2,     // minPlayers
                        10,    // maxPlayers
                        100,   // entryCost
                        80,    // winnerPct
                        30,    // roundDurationSeconds
                        20,    // startDelaySeconds (after min reached, 20s to fill / start)
                        GameType.FRIDGE
                ));
            }

            long openRooms = roomRepo.findAllByStatus(RoomStatus.NEW).size()
                    + roomRepo.findAllByStatus(RoomStatus.STARTING_SOON).size();
            if (openRooms == 0) {
                templateRepo.findActive().stream().findFirst().ifPresent(t -> {
                    log.info("[DataSeeder] No open rooms — spawning a starter room for template {}", t.getTemplateId());
                    rooms.create(new CreateRoomRequest(
                            t.getTemplateId(), null, null, null, null, null, null, null, null, null, null));
                });
            }
        } catch (Exception e) {
            log.warn("[DataSeeder] seed failed: {}", e.getMessage());
        }
    }
}
