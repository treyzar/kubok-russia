package com.onlineshop.service;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.dto.AdminDtos.TemplateStatus;
import com.onlineshop.dto.RoomDtos.CreateRoomRequest;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.repository.RoomRepository;
import com.onlineshop.repository.RoomTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;

/** Mirrors internal/service/TemplateLifecycleManager. */
@Service
@Slf4j
@RequiredArgsConstructor
public class TemplateLifecycleService {

    private final RoomTemplateRepository templateRepo;
    private final RoomRepository roomRepo;
    private final RoomService roomService;

    @Transactional(readOnly = true)
    public List<RoomTemplate> list() { return templateRepo.findActive(); }

    @Transactional(readOnly = true)
    public List<RoomTemplate> listAll() { return templateRepo.findAll(); }

    @Transactional(readOnly = true)
    public RoomTemplate get(Integer id) {
        return templateRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("template not found"));
    }

    @Transactional(readOnly = true)
    public TemplateStatus getStatus(Integer templateId) {
        get(templateId);
        RoomRepository.StatusCounts c = roomRepo.countActiveAndWaiting(templateId);
        int active = (int) c.active;
        int waiting = (int) c.waiting;
        return new TemplateStatus(templateId, active, waiting, active == 0 && waiting == 0);
    }

    /**
     * Soft-delete: existing rooms continue to live until they finish naturally.
     * New rooms cannot be created from a soft-deleted template (the admin UI
     * filters them out and {@link #list()} excludes them).
     */
    @Transactional
    public void delete(Integer templateId) {
        RoomTemplate t = get(templateId);
        if (t.getDeletedAt() == null) {
            t.setDeletedAt(Instant.now());
            templateRepo.save(t);
        }
    }

    @Transactional
    public RoomTemplate update(Integer templateId, TemplateDto dto) {
        validateCrossField(dto);
        RoomTemplate t = get(templateId);
        applyDto(t, dto);
        return templateRepo.save(t);
    }

    @Transactional
    public RoomTemplate create(TemplateDto dto) {
        validateCrossField(dto);
        RoomTemplate t = new RoomTemplate();
        applyDto(t, dto);
        RoomTemplate saved = templateRepo.save(t);

        // Auto-create one open room for the new template so players can join immediately.
        try {
            roomService.create(new CreateRoomRequest(
                    saved.getTemplateId(),
                    null, null, null,
                    null, null, null, null, null, null, null));
        } catch (Exception e) {
            log.warn("Failed to auto-create room for template {}: {}", saved.getTemplateId(), e.getMessage());
        }
        return saved;
    }

    /** Cross-field check on min/max. */
    static void validateCrossField(TemplateDto dto) {
        if (dto.minPlayers() != null && dto.maxPlayers() != null
                && dto.minPlayers() > dto.maxPlayers()) {
            throw new IllegalArgumentException("min_players cannot be greater than max_players");
        }
    }

    private void applyDto(RoomTemplate t, TemplateDto dto) {
        t.setName(dto.effectiveName());
        int playersNeeded = dto.effectivePlayersNeeded();
        t.setPlayersNeeded(playersNeeded);
        t.setMaxPlayers(dto.maxPlayers() != null ? dto.maxPlayers() : playersNeeded);
        t.setMinPlayers(dto.minPlayers() != null ? dto.minPlayers() : Math.min(2, playersNeeded));
        t.setEntryCost(dto.entryCost());
        t.setWinnerPct(dto.winnerPct());
        t.setRoundDurationSeconds(dto.effectiveRoundDurationSeconds());
        t.setStartDelaySeconds(dto.effectiveStartDelaySeconds());
        t.setGameType(dto.effectiveGameType());
    }
}
