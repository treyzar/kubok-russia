package com.onlineshop.service;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.events.EventPublisher;
import com.onlineshop.exception.DomainExceptions.*;
import com.onlineshop.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Java port of backend/handlers/room_handler.go core flow + RoomService cron logic.
 * All money is integer game currency.
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
                .jackpot(0)
                .status(RoomStatus.NEW)
                .playersNeeded(t.getPlayersNeeded())
                .minPlayers(t.getMinPlayers())
                .entryCost(t.getEntryCost())
                .winnerPct(t.getWinnerPct())
                .roundDurationSeconds(t.getRoundDurationSeconds())
                .startDelaySeconds(t.getStartDelaySeconds())
                .gameType(t.getGameType())
                .templateId(t.getTemplateId())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return roomRepo.save(room);
    }

    @Transactional
    public Room createDirect(int playersNeeded, int minPlayers, int entryCost, int winnerPct,
                             int roundDuration, int startDelay,
                             com.onlineshop.domain.enums.GameType gameType) {
        Room r = Room.builder()
                .jackpot(0).status(RoomStatus.NEW)
                .playersNeeded(playersNeeded).minPlayers(minPlayers)
                .entryCost(entryCost).winnerPct(winnerPct)
                .roundDurationSeconds(roundDuration).startDelaySeconds(startDelay)
                .gameType(gameType)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        return roomRepo.save(r);
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

        int entryCost = room.getEntryCost();
        if (entryCost > 0) userService.debit(userId, entryCost);

        // First place is bundled with the entry — create one room_places row.
        int placeIndex = nextPlaceIndex(roomId);
        placeRepo.save(RoomPlace.builder()
                .roomId(roomId).userId(userId).placeIndex(placeIndex).build());

        playerRepo.save(RoomPlayer.builder()
                .roomId(roomId).userId(userId).placeId(placeIndex).build());

        room.setJackpot(room.getJackpot() + entryCost);

        long newCount = count + 1;
        if (newCount >= room.getMinPlayers() && room.getStatus() == RoomStatus.NEW) {
            armStart(room);
        }
        roomRepo.save(room);

        events.publishPlayerJoined(roomId, userId, 1);
    }

    @Transactional
    public void leave(Integer roomId, Integer userId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.NEW)
            throw new RoomNotAcceptingException();
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new PlayerNotInRoomException();

        long places = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p -> userId.equals(p.getUserId())).count();
        int refund = (int) places * room.getEntryCost();

        playerRepo.deleteByRoomIdAndUserId(roomId, userId);
        // FK ON DELETE CASCADE wipes places too via room_places? Actually room_places
        // has no FK back from room_players; we delete explicitly.
        placeRepo.deleteAllByRoomIdAndUserId(roomId, userId);

        room.setJackpot(Math.max(0, room.getJackpot() - refund));
        roomRepo.save(room);

        if (refund > 0) userService.credit(userId, refund);
    }

    @Transactional
    public void boost(Integer roomId, Integer userId, int amount) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new PlayerNotInRoomException();
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");

        userService.debit(userId, amount);
        boostRepo.findById(new RoomBoost.PK(roomId, userId)).ifPresentOrElse(
                ex -> { ex.setAmount(ex.getAmount() + amount); boostRepo.save(ex); },
                () -> boostRepo.save(RoomBoost.builder()
                        .roomId(roomId).userId(userId).amount(amount).build())
        );
        room.setJackpot(room.getJackpot() + amount);
        roomRepo.save(room);

        events.publishBoostApplied(roomId, userId, amount);
    }

    @Transactional
    public void claimPlaces(Integer roomId, Integer userId, int count) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new PlayerNotInRoomException();

        int cost = room.getEntryCost() * count;
        userService.debit(userId, cost);
        int next = nextPlaceIndex(roomId);
        for (int i = 0; i < count; i++) {
            placeRepo.save(RoomPlace.builder()
                    .roomId(roomId).userId(userId).placeIndex(next + i).build());
        }
        room.setJackpot(room.getJackpot() + cost);
        roomRepo.save(room);
    }

    /**
     * Settle a room: weighted RNG over (entry_cost*places + boost), award
     * jackpot * winner_pct / 100, transition to FINISHED.
     */
    @Transactional
    public void settle(Integer roomId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.PLAYING) throw new RoomNotWaitingException();

        List<RoomPlayer> players = playerRepo.findAllByRoomId(roomId);
        if (players.isEmpty()) {
            room.setStatus(RoomStatus.FINISHED);
            roomRepo.save(room);
            return;
        }
        List<RoomPlace> places = placeRepo.findAllByRoomId(roomId);
        List<RoomBoost> boosts = boostRepo.findAllByRoomId(roomId);

        // Build weight per user: entry_cost * place_count + total boost
        java.util.Map<Integer, Integer> weights = new java.util.LinkedHashMap<>();
        for (RoomPlayer p : players) weights.put(p.getUserId(), 0);
        for (RoomPlace pl : places) {
            weights.merge(pl.getUserId(), room.getEntryCost(), Integer::sum);
        }
        for (RoomBoost b : boosts) {
            weights.merge(b.getUserId(), b.getAmount(), Integer::sum);
        }

        int totalWeight = weights.values().stream().mapToInt(Integer::intValue).sum();
        int pick = totalWeight > 0 ? rng.selectRandom(totalWeight, roomId, players.size()) : 0;
        int acc = 0;
        Integer winnerId = players.get(0).getUserId();
        for (var e : weights.entrySet()) {
            acc += e.getValue();
            if (pick < acc) { winnerId = e.getKey(); break; }
        }

        int prize = room.getJackpot() * room.getWinnerPct() / 100;
        winnerRepo.save(RoomWinner.builder()
                .roomId(roomId).userId(winnerId).prize(prize).build());
        userService.credit(winnerId, prize);

        room.setStatus(RoomStatus.FINISHED);
        roomRepo.save(room);
        events.publishGameFinished(roomId, winnerId, prize);
    }

    // ------- boost calculations (matches Go) -------

    /**
     * Probability (%) the user would win after adding `boost`:
     * 100 * (totalPlayerAmount + boost) / (poolBase + acc + boost)
     * where totalPlayerAmount is the user's stake (entry_cost*places + existing boost),
     * poolBase is jackpot of all other players' entry_cost*places,
     * acc is total of all other players' existing boosts.
     */
    public double calcBoostProbability(Integer roomId, Integer userId, int boost) {
        Room r = roomRepo.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        long userPlaces = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p -> userId.equals(p.getUserId())).count();
        int userBoost = boostRepo.findById(new RoomBoost.PK(roomId, userId))
                .map(RoomBoost::getAmount).orElse(0);
        int userTotal = (int) userPlaces * r.getEntryCost() + userBoost;

        int totalEntry = (int) placeRepo.countByRoomId(roomId) * r.getEntryCost();
        int totalBoost = boostRepo.findAllByRoomId(roomId).stream()
                .mapToInt(RoomBoost::getAmount).sum();
        int poolBase = totalEntry - (int) userPlaces * r.getEntryCost();
        int acc = totalBoost - userBoost;

        long denom = (long) poolBase + acc + userTotal + boost;
        if (denom <= 0) return 0.0;
        return 100.0 * (userTotal + boost) / denom;
    }

    /** Required boost to reach probability p (0..100). */
    public int calcRequiredBoost(Integer roomId, Integer userId, double p) {
        if (p <= 0) return 0;
        if (p >= 100) return Integer.MAX_VALUE;
        Room r = roomRepo.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        long userPlaces = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p2 -> userId.equals(p2.getUserId())).count();
        int userBoost = boostRepo.findById(new RoomBoost.PK(roomId, userId))
                .map(RoomBoost::getAmount).orElse(0);
        int userTotal = (int) userPlaces * r.getEntryCost() + userBoost;

        int totalEntry = (int) placeRepo.countByRoomId(roomId) * r.getEntryCost();
        int totalBoost = boostRepo.findAllByRoomId(roomId).stream()
                .mapToInt(RoomBoost::getAmount).sum();
        int poolBase = totalEntry - (int) userPlaces * r.getEntryCost();
        int acc = totalBoost - userBoost;

        // ceil((p * (poolBase + acc) - 100 * userTotal) / (100 - p))
        double num = p * (poolBase + acc) - 100.0 * userTotal;
        double req = num / (100.0 - p);
        return (int) Math.max(0, Math.ceil(req));
    }

    // ------- helpers -------

    private int nextPlaceIndex(Integer roomId) {
        return placeRepo.findMaxIndexByRoomId(roomId).orElse(0) + 1;
    }

    private void armStart(Room room) {
        room.setStatus(RoomStatus.STARTING_SOON);
        room.setStartTime(Instant.now().plus(Duration.ofSeconds(room.getStartDelaySeconds())));
        events.publishRoomStarting(room.getRoomId(), room.getStartTime());
    }
}
