package com.onlineshop.service;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.GameType;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.exception.DomainExceptions.*;
import com.onlineshop.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Java port of backend/handlers/room_handler.go core flow + RoomService cron logic.
 * Handles join / boost / claim_place / settle for classic (template-driven) rooms.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoomService {

    private final RoomRepository roomRepo;
    private final RoomPlayerRepository playerRepo;
    private final RoomBoostRepository boostRepo;
    private final RoomWinnerRepository winnerRepo;
    private final RoomPlaceRepository placeRepo;
    private final RoomTemplateRepository templateRepo;
    private final UserService userService;
    private final EventPublisher events;
    private final RngClient rng;

    @Transactional
    public Room createFromTemplate(Integer templateId) {
        RoomTemplate t = templateRepo.findById(templateId)
                .orElseThrow(() -> new NoSuchElementException("template not found"));
        Room room = Room.builder()
                .jackpot(BigDecimal.ZERO)
                .status(RoomStatus.NEW)
                .playersNeeded(t.getPlayersNeeded())
                .templateId(t.getTemplateId())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return roomRepo.save(room);
    }

    @Transactional
    public void join(Integer roomId, Integer userId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.NEW && room.getStatus() != RoomStatus.STARTING_SOON)
            throw new RoomNotAcceptingException();
        if (playerRepo.existsByRoomIdAndUserId(roomId, userId)) throw new DuplicatePlayerException();

        long count = playerRepo.countByRoomId(roomId);
        if (count >= room.getPlayersNeeded()) throw new RoomFullException();

        // Charge entry cost from template if available.
        BigDecimal entryCost = entryCostFor(room);
        if (entryCost.signum() > 0) userService.debit(userId, entryCost);

        playerRepo.save(RoomPlayer.builder().roomId(roomId).userId(userId).build());
        // First place is free; matches Go behaviour.
        placeRepo.save(RoomPlace.builder()
                .roomId(roomId).userId(userId).placeIndex(nextPlaceIndex(roomId)).build());
        room.setJackpot(room.getJackpot().add(entryCost));

        // Schedule start when full or arm starting_soon when min reached.
        long newCount = count + 1;
        if (newCount >= room.getPlayersNeeded() && room.getStatus() != RoomStatus.PLAYING) {
            armStart(room);
        }
        roomRepo.save(room);

        events.publish(roomId.toString(), "player_joined",
                Map.of("user_id", userId, "jackpot", room.getJackpot()));
    }

    @Transactional
    public void boost(Integer roomId, Integer userId, BigDecimal amount) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new IllegalArgumentException("player not in room");

        userService.debit(userId, amount);
        boostRepo.findById(new RoomBoost.PK(roomId, userId))
                .ifPresentOrElse(
                        existing -> {
                            existing.setAmount(existing.getAmount().add(amount));
                            boostRepo.save(existing);
                        },
                        () -> boostRepo.save(RoomBoost.builder()
                                .roomId(roomId).userId(userId).amount(amount).build())
                );
        room.setJackpot(room.getJackpot().add(amount));
        roomRepo.save(room);

        events.publish(roomId.toString(), "boost_applied",
                Map.of("user_id", userId, "amount", amount, "jackpot", room.getJackpot()));
    }

    @Transactional
    public void claimPlaces(Integer roomId, Integer userId, int count) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new IllegalArgumentException("player not in room");

        BigDecimal entryCost = entryCostFor(room);
        BigDecimal cost = entryCost.multiply(BigDecimal.valueOf(count));
        userService.debit(userId, cost);

        int next = nextPlaceIndex(roomId);
        for (int i = 0; i < count; i++) {
            placeRepo.save(RoomPlace.builder()
                    .roomId(roomId).userId(userId).placeIndex(next + i).build());
        }
        room.setJackpot(room.getJackpot().add(cost));
        roomRepo.save(room);
    }

    /**
     * Settle a room: pick a winner using the RNG client, write winner row, credit prize,
     * and transition to FINISHED.
     */
    @Transactional
    public void settle(Integer roomId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.PLAYING) throw new RoomNotWaitingException();

        List<RoomPlace> places = placeRepo.findAllByRoomId(roomId);
        if (places.isEmpty()) {
            room.setStatus(RoomStatus.FINISHED);
            roomRepo.save(room);
            return;
        }
        int winnerIndex = rng.pickInt(places.size());
        Integer winnerUserId = places.get(winnerIndex).getUserId();

        BigDecimal prize = computePrize(room);
        winnerRepo.save(RoomWinner.builder()
                .roomId(roomId).userId(winnerUserId).prize(prize).build());
        userService.credit(winnerUserId, prize);

        room.setStatus(RoomStatus.FINISHED);
        roomRepo.save(room);
        events.publish(roomId.toString(), "game_finished",
                Map.of("winner_user_id", winnerUserId, "prize", prize));
    }

    // --- helpers ---

    private BigDecimal entryCostFor(Room room) {
        if (room.getTemplateId() == null) return BigDecimal.ZERO;
        return templateRepo.findById(room.getTemplateId())
                .map(t -> BigDecimal.valueOf(t.getEntryCost()))
                .orElse(BigDecimal.ZERO);
    }

    private BigDecimal computePrize(Room room) {
        int pct = room.getTemplateId() == null ? 80
                : templateRepo.findById(room.getTemplateId())
                .map(RoomTemplate::getWinnerPct).orElse(80);
        return room.getJackpot().multiply(BigDecimal.valueOf(pct))
                .divide(BigDecimal.valueOf(100));
    }

    private int nextPlaceIndex(Integer roomId) {
        return placeRepo.findMaxIndexByRoomId(roomId).orElse(0) + 1;
    }

    private void armStart(Room room) {
        int delay = 30;
        if (room.getTemplateId() != null) {
            delay = templateRepo.findById(room.getTemplateId())
                    .map(RoomTemplate::getStartDelaySeconds).orElse(30);
        }
        room.setStatus(RoomStatus.STARTING_SOON);
        room.setStartTime(Instant.now().plus(Duration.ofSeconds(delay)));
        events.publish(room.getRoomId().toString(), "room_starting",
                Map.of("starts_at", room.getStartTime()));
    }
}
