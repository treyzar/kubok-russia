package com.onlineshop.service;

import com.onlineshop.domain.entity.RoomTemplate;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.dto.AdminDtos.TemplateStatus;
import com.onlineshop.dto.TemplateDto;
import com.onlineshop.exception.DomainExceptions.TemplateInUseException;
import com.onlineshop.repository.RoomRepository;
import com.onlineshop.repository.RoomTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.NoSuchElementException;

/** Mirrors internal/service/TemplateLifecycleManager. */
@Service
@RequiredArgsConstructor
public class TemplateLifecycleService {

    private final RoomTemplateRepository templateRepo;
    private final RoomRepository roomRepo;

    @Transactional(readOnly = true)
    public List<RoomTemplate> list() { return templateRepo.findAll(); }

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

    @Transactional
    public void delete(Integer templateId) {
        TemplateStatus s = getStatus(templateId);
        if (!s.canDelete()) throw new TemplateInUseException(
                "cannot delete template: %d active rooms and %d waiting rooms exist"
                        .formatted(s.activeRooms(), s.waitingRooms()));
        // Mirror Go DeleteTemplateWithRooms: remove finished/new dependent rooms first
        // to avoid FK violations. Active/waiting rooms are already excluded by canDelete().
        roomRepo.deleteByTemplateIdAndStatusIn(templateId,
                EnumSet.of(RoomStatus.FINISHED, RoomStatus.NEW));
        templateRepo.deleteById(templateId);
    }

    @Transactional
    public RoomTemplate update(Integer templateId, TemplateDto dto) {
        TemplateStatus s = getStatus(templateId);
        if (!s.canDelete()) throw new TemplateInUseException(
                "cannot update template: %d active rooms and %d waiting rooms exist"
                        .formatted(s.activeRooms(), s.waitingRooms()));
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

    /** Mirrors Go template_handler.go cross-field check. */
    static void validateCrossField(TemplateDto dto) {
        if (dto.minPlayers() != null && dto.playersNeeded() != null
                && dto.minPlayers() > dto.playersNeeded()) {
            throw new IllegalArgumentException("min_players cannot be greater than players_needed");
        }
    }

    private void applyDto(RoomTemplate t, TemplateDto dto) {
        t.setName(dto.name());
        t.setPlayersNeeded(dto.playersNeeded());
        t.setMinPlayers(dto.minPlayers());
        t.setEntryCost(dto.entryCost());
        t.setWinnerPct(dto.winnerPct());
        t.setRoundDurationSeconds(dto.roundDurationSeconds());
        t.setStartDelaySeconds(dto.startDelaySeconds());
        t.setGameType(dto.gameType());
    }
}
