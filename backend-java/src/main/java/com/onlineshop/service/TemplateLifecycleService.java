package com.onlineshop.service;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.dto.AdminDtos.TemplateStatus;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.repository.RoomRepository;
import com.onlineshop.repository.RoomTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;

/** Mirrors internal/service/TemplateLifecycleManager. */
@Service
@RequiredArgsConstructor
public class TemplateLifecycleService {

    private final RoomTemplateRepository templateRepo;
    private final RoomRepository roomRepo;

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
        return templateRepo.save(t);
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
        // max_players is the canonical field; mirror it onto the legacy
        // players_needed column so the room-creation pipeline keeps working.
        t.setMaxPlayers(dto.maxPlayers());
        t.setPlayersNeeded(dto.effectivePlayersNeeded());
        t.setMinPlayers(dto.minPlayers());
        t.setEntryCost(dto.entryCost());
        t.setWinnerPct(dto.winnerPct());
        t.setRoundDurationSeconds(dto.effectiveRoundDurationSeconds());
        t.setStartDelaySeconds(dto.effectiveStartDelaySeconds());
        t.setGameType(dto.effectiveGameType());
    }
}
