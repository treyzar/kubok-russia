package com.onlineshop.service;

import com.onlineshop.domain.entity.FairPlayer;
import com.onlineshop.domain.entity.FairRoom;
import com.onlineshop.domain.enums.FairRoomState;
import com.onlineshop.domain.enums.RiskLevel;
import com.onlineshop.dto.FairRoomDto;
import com.onlineshop.dto.JoinResultDto;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.exception.DomainExceptions.*;
import com.onlineshop.repository.FairPlayerRepository;
import com.onlineshop.repository.FairRoomRepository;
import com.onlineshop.util.SeedGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.function.BiConsumer;

/**
 * Java port of internal/service/RoomService for provably fair rooms.
 * Algorithm parity preserved: lock room → capacity/state checks → insert player →
 * transition created→waiting → outside-tx auto-scale.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FairRoomService {

    private final FairRoomRepository roomRepo;
    private final FairPlayerRepository playerRepo;
    private final EventPublisher events;

    /**
     * Pluggable balance credit hook. Default is a no-op stub, matching the Go default.
     * Bind a real implementation as a Spring bean named "fairCreditFn" to override.
     */
    private BiConsumer<UUID, BigDecimal> creditFn = (userId, amount) -> { /* no-op */ };

    public void setCreditFn(BiConsumer<UUID, BigDecimal> fn) {
        if (fn != null) this.creditFn = fn;
    }

    @Transactional
    public FairRoomDto createRoom(RiskLevel level) {
        SeedGenerator.Seed seed = SeedGenerator.generate();
        FairRoom room = FairRoom.builder()
                .id(UUID.randomUUID())
                .riskLevel(level)
                .state(FairRoomState.CREATED)
                .maxCapacity(10)
                .seedPhrase(seed.phrase())
                .seedHash(seed.hash())
                .finalFee(BigDecimal.ZERO)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        FairRoom saved = roomRepo.saveAndFlush(room);
        saved.setPlayerCount(0);
        return FairRoomDto.from(saved);
    }

    @Transactional(readOnly = true)
    public FairRoomDto getRoom(UUID id) {
        FairRoom r = roomRepo.findById(id)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        r.setPlayerCount(playerRepo.countByRoomId(id));
        return FairRoomDto.from(r);
    }

    @Transactional(readOnly = true)
    public List<FairRoomDto> listRooms(RiskLevel level) {
        List<RiskLevel> levels = RiskLevel.ORDER.get(level);
        if (levels == null) throw new IllegalArgumentException("unknown risk level: " + level);
        List<FairRoom> rooms = roomRepo.findAvailableForLevels(levels);
        List<FairRoomDto> out = new ArrayList<>(rooms.size());
        for (FairRoom r : rooms) {
            long count = playerRepo.countByRoomId(r.getId());
            if (count >= r.getMaxCapacity()) continue;
            r.setPlayerCount(count);
            out.add(FairRoomDto.from(r));
        }
        return out;
    }

    @Transactional
    public JoinResultDto joinRoom(UUID roomId, UUID userId, BigDecimal deposit) {
        FairRoom room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));

        if (room.getState() == FairRoomState.REFUNDING || room.getState() == FairRoomState.FINISHED) {
            throw new RoomNotAcceptingException();
        }
        long count = playerRepo.countByRoomId(roomId);
        if (count >= room.getMaxCapacity()) throw new RoomFullException();
        if (playerRepo.existsByRoomIdAndUserId(roomId, userId)) throw new DuplicatePlayerException();

        FairPlayer player = FairPlayer.builder()
                .id(UUID.randomUUID())
                .roomId(roomId)
                .userId(userId)
                .initialDeposit(deposit)
                .refundAmount(BigDecimal.ZERO)
                .refunded(false)
                .build();
        playerRepo.saveAndFlush(player);

        if (room.getState() == FairRoomState.CREATED) {
            roomRepo.updateState(roomId, FairRoomState.WAITING, Instant.now());
            room.setState(FairRoomState.WAITING);
        }
        room.setPlayerCount(count + 1);

        // Auto-scale check after commit (best-effort).
        UUID newRoomId = null;
        try {
            newRoomId = checkAndScale(room.getRiskLevel());
        } catch (Exception e) {
            log.warn("checkAndScale failed: {}", e.getMessage());
        }

        events.publish(roomId.toString(), "player_joined", Map.of(
                "user_id", userId.toString(),
                "deposit", deposit
        ));

        return new JoinResultDto(player, FairRoomDto.from(room), newRoomId != null, newRoomId);
    }

    /**
     * Atomic refund algorithm: lock room → MIN(deposit) → set final_fee+refunding →
     * write per-player refund + credit → state=finished.
     */
    @Transactional
    public void startGame(UUID roomId) {
        FairRoom room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getState() != FairRoomState.WAITING) throw new RoomNotWaitingException();

        BigDecimal minDeposit = playerRepo.findMinDepositForUpdate(roomId)
                .orElse(BigDecimal.ZERO);

        Instant now = Instant.now();
        roomRepo.updateFinalFeeToRefunding(roomId, minDeposit, now);

        List<FairPlayer> players = playerRepo.findAllByRoomId(roomId);
        for (FairPlayer p : players) {
            BigDecimal refund = p.getInitialDeposit().subtract(minDeposit);
            if (refund.signum() < 0) refund = BigDecimal.ZERO;
            playerRepo.updateRefund(p.getId(), refund);
            try {
                creditFn.accept(p.getUserId(), refund);
            } catch (Exception e) {
                throw new CreditFailedException("refund transaction failed: " + e.getMessage());
            }
        }

        roomRepo.updateState(roomId, FairRoomState.FINISHED, Instant.now());

        events.publish(roomId.toString(), "game_finished", Map.of(
                "final_fee", minDeposit,
                "seed_phrase", room.getSeedPhrase()
        ));
    }

    /**
     * Creates a new room of the same risk level if ≥70% of active rooms are ≥70% full.
     * Returns the new room's id, or null.
     */
    UUID checkAndScale(RiskLevel level) {
        List<FairRoom> rooms = roomRepo.findActiveByRisk(level);
        if (rooms.isEmpty()) return null;
        int atThreshold = 0;
        for (FairRoom r : rooms) {
            long c = playerRepo.countByRoomId(r.getId());
            if ((double) c / r.getMaxCapacity() >= 0.70) atThreshold++;
        }
        double ratio = (double) atThreshold / rooms.size();
        if (ratio >= 0.70) {
            FairRoomDto created = createRoom(level);
            return created.id();
        }
        return null;
    }
}
