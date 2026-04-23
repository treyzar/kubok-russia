package com.onlineshop.service;

import com.onlineshop.domain.entity.*;
import com.onlineshop.domain.enums.GameType;
import com.onlineshop.domain.enums.RoomStatus;
import com.onlineshop.dto.RoomDtos.CreateRoomRequest;
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
    private final UserRepository userRepo;
    private final UserService userService;
    private final EventPublisher events;
    private final RngClient rng;

    /**
     * Mirrors Go {@code RoomHandler.Create}:
     *  - if {@code templateId} is set, pull players_needed/min_players/entry_cost/
     *    winner_pct/round_duration/start_delay/game_type from the template;
     *  - otherwise apply per-field defaults
     *    (min_players=1, winner_pct=80, round=30, delay=60, game_type=train).
     */
    @Transactional
    public Room create(CreateRoomRequest req) {
        int minPlayers, winnerPct, roundDuration, startDelay, playersNeeded, entryCost;
        GameType gameType;
        Integer templateId = req.templateId();

        if (templateId != null) {
            RoomTemplate t = templateRepo.findById(templateId)
                    .orElseThrow(() -> new NoSuchElementException("template not found"));
            if (t.getDeletedAt() != null) {
                throw new IllegalArgumentException("template has been deleted");
            }
            playersNeeded = req.playersNeeded() != null ? req.playersNeeded() : t.getPlayersNeeded();
            entryCost = req.entryCost() != null ? req.entryCost() : t.getEntryCost();
            minPlayers = t.getMinPlayers();
            winnerPct = t.getWinnerPct();
            roundDuration = t.getRoundDurationSeconds();
            startDelay = t.getStartDelaySeconds();
            gameType = t.getGameType();
        } else {
            if (req.playersNeeded() == null || req.entryCost() == null)
                throw new IllegalArgumentException("players_needed and entry_cost are required when no template_id is provided");
            playersNeeded = req.playersNeeded();
            entryCost = req.entryCost();
            minPlayers = req.minPlayers() != null ? req.minPlayers() : 1;
            if (minPlayers > playersNeeded)
                throw new IllegalArgumentException("min_players cannot be greater than players_needed");
            winnerPct = req.winnerPct() != null ? req.winnerPct() : 80;
            roundDuration = req.roundDurationSeconds() != null ? req.roundDurationSeconds() : 30;
            startDelay = req.startDelaySeconds() != null ? req.startDelaySeconds() : 60;
            String gtRaw = req.gameType();
            if (gtRaw != null && !gtRaw.isBlank()
                    && !gtRaw.equals("train") && !gtRaw.equals("fridge")) {
                throw new IllegalArgumentException("game_type must be one of: train, fridge");
            }
            gameType = (gtRaw == null || gtRaw.isBlank()) ? GameType.TRAIN : GameType.fromValue(gtRaw);
        }

        Room room = Room.builder()
                .jackpot(req.jackpot() != null ? req.jackpot() : 0)
                .startTime(req.startTime())
                .status(req.status() != null && !req.status().isBlank()
                        ? RoomStatus.fromValue(req.status()) : RoomStatus.NEW)
                .playersNeeded(playersNeeded)
                .minPlayers(minPlayers)
                .entryCost(entryCost)
                .winnerPct(winnerPct)
                .roundDurationSeconds(roundDuration)
                .startDelaySeconds(startDelay)
                .gameType(gameType)
                .templateId(templateId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return roomRepo.save(room);
    }

    /**
     * Join with optional {@code places} (default 1). Mirrors Go JoinRoom:
     *  - status must be NEW or STARTING_SOON;
     *  - structured 402 with required/current/shortfall on insufficient balance;
     *  - debits {@code entry_cost * places} and creates that many room_places;
     *  - publishes {@code player_joined} with the actual {@code places} count.
     */
    @Transactional
    public Room join(Integer roomId, Integer userId, Integer placesIn) {
        int places = (placesIn == null || placesIn <= 0) ? 1 : placesIn;

        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.NEW && room.getStatus() != RoomStatus.STARTING_SOON)
            throw new RoomNotAcceptingException();
        if (playerRepo.existsByRoomIdAndUserId(roomId, userId)) throw new DuplicatePlayerException();
        long count = playerRepo.countByRoomId(roomId);
        if (count >= room.getPlayersNeeded()) throw new RoomFullException();

        int totalCost = room.getEntryCost() * places;

        // Pre-check balance and respond with structured 402 on shortfall.
        if (totalCost > 0) {
            User u = userRepo.findById(userId)
                    .orElseThrow(() -> new NoSuchElementException("user not found"));
            if (u.getBalance() < totalCost) {
                throw new InsufficientBalanceForRoomException(
                        "Insufficient balance for entry", totalCost, u.getBalance());
            }
            userService.debit(userId, totalCost);
        }

        // Insert N place rows + a single room_players entry pinned to the first place.
        int firstPlaceIndex = nextPlaceIndex(roomId);
        for (int i = 0; i < places; i++) {
            placeRepo.save(RoomPlace.builder()
                    .roomId(roomId).userId(userId).placeIndex(firstPlaceIndex + i).build());
        }
        playerRepo.save(RoomPlayer.builder()
                .roomId(roomId).userId(userId).placeId(firstPlaceIndex).build());

        room.setJackpot(room.getJackpot() + totalCost);

        long newCount = count + 1;
        if (newCount >= room.getMinPlayers() && room.getStatus() == RoomStatus.NEW) {
            armStart(room);
        }
        Room saved = roomRepo.save(room);
        events.publishPlayerJoined(roomId, userId, places);
        return saved;
    }

    /**
     * Leave allowed in NEW or STARTING_SOON (matches Go LeaveRoomAndUpdateStatus).
     */
    @Transactional
    public Room leave(Integer roomId, Integer userId) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (room.getStatus() != RoomStatus.NEW && room.getStatus() != RoomStatus.STARTING_SOON)
            throw new RoomNotAcceptingException();
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new PlayerNotInRoomException();

        long places = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p -> userId.equals(p.getUserId())).count();
        int refund = (int) places * room.getEntryCost();

        playerRepo.deleteByRoomIdAndUserId(roomId, userId);
        placeRepo.deleteAllByRoomIdAndUserId(roomId, userId);

        room.setJackpot(Math.max(0, room.getJackpot() - refund));
        // Mirror Go: if last player left while room was NEW/STARTING_SOON, revert to NEW.
        long remaining = playerRepo.countByRoomId(roomId);
        if (remaining == 0 && (room.getStatus() == RoomStatus.NEW
                || room.getStatus() == RoomStatus.STARTING_SOON)) {
            room.setStatus(RoomStatus.NEW);
            room.setStartTime(null);
        }
        Room saved = roomRepo.save(room);

        if (refund > 0) userService.credit(userId, refund);
        return saved;
    }

    /**
     * Boost. Mirrors Go {@code BoostRoom}:
     *  - structured 402 on insufficient balance;
     *  - rejects duplicate boost from the same user with HTTP 409 ({@link DuplicateBoostException}).
     */
    @Transactional
    public Room boost(Integer roomId, Integer userId, int amount) {
        Room room = roomRepo.findByIdForUpdate(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        if (!playerRepo.existsByRoomIdAndUserId(roomId, userId))
            throw new PlayerNotInRoomException();
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");

        // Pre-check balance with structured 402.
        User u = userRepo.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        if (u.getBalance() < amount) {
            throw new InsufficientBalanceForRoomException(
                    "Insufficient balance for boost", amount, u.getBalance());
        }

        // Reject duplicate boost (Go returns 409).
        if (boostRepo.findById(new RoomBoost.PK(roomId, userId)).isPresent()) {
            throw new DuplicateBoostException();
        }

        userService.debit(userId, amount);
        boostRepo.save(RoomBoost.builder()
                .roomId(roomId).userId(userId).amount(amount).build());
        room.setJackpot(room.getJackpot() + amount);
        Room saved = roomRepo.save(room);

        events.publishBoostApplied(roomId, userId, amount);
        return saved;
    }

    /**
     * Settle a room: weighted RNG over (entry_cost*places + boost), award
     * jackpot * winner_pct / 100, transition to FINISHED. Internal use only —
     * called by RoomFinisherJob (mirrors Go cron, no public HTTP endpoint).
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

        java.util.Map<Integer, Integer> weights = new java.util.LinkedHashMap<>();
        for (RoomPlayer p : players) weights.put(p.getUserId(), 0);
        for (RoomPlace pl : places) weights.merge(pl.getUserId(), room.getEntryCost(), Integer::sum);
        for (RoomBoost b : boosts) weights.merge(b.getUserId(), b.getAmount(), Integer::sum);

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

        // Auto-spawn a fresh room for the same template so the lobby stays populated.
        if (room.getTemplateId() != null) {
            try {
                templateRepo.findById(room.getTemplateId()).ifPresent(t -> {
                    if (t.getDeletedAt() == null) {
                        create(new CreateRoomRequest(
                                room.getTemplateId(),
                                null, null, null,
                                null, null, null, null, null, null, null));
                        log.info("Auto-spawned new room for template {}", room.getTemplateId());
                    }
                });
            } catch (Exception e) {
                log.warn("Auto-spawn room failed for template {}: {}", room.getTemplateId(), e.getMessage());
            }
        }
    }

    // ------- boost calculations (mirrors Go roomCalcData/CalcProbability/CalcBoost) -------

    /**
     * Probability (%) the user would win after adding {@code boost}.
     *
     * <p>Formula (matches Go):
     * <pre>
     *   poolBase = players_needed * entry_cost  // FIXED, the entire seat pool
     *   acc      = SUM(boost) over ALL players in the room (including the user)
     *   total    = entry_cost * places(user) + existing_boost(user)
     *   p = 100 * (total + boost) / (poolBase + acc + boost)
     * </pre>
     * Note: there is NO subtraction of the user's own places/boost here — the
     * pool denominator is the whole room.
     */
    public double calcBoostProbability(Integer roomId, Integer userId, int boost) {
        Room r = roomRepo.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        long userPlaces = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p -> userId.equals(p.getUserId())).count();
        int userBoost = boostRepo.findById(new RoomBoost.PK(roomId, userId))
                .map(RoomBoost::getAmount).orElse(0);
        int total = (int) userPlaces * r.getEntryCost() + userBoost;

        long poolBase = (long) r.getPlayersNeeded() * r.getEntryCost();
        long acc = boostRepo.findAllByRoomId(roomId).stream()
                .mapToLong(RoomBoost::getAmount).sum();

        double denom = poolBase + acc + boost;
        if (denom <= 0) denom = 1;
        return 100.0 * (total + boost) / denom;
    }

    /**
     * Required boost to reach probability {@code p} (0 < p < 100), exclusive bounds.
     *
     * <p>Formula (matches Go):
     * <pre>
     *   ceil( (p*(poolBase + acc) - 100*total) / (100 - p) )
     * </pre>
     */
    public int calcRequiredBoost(Integer roomId, Integer userId, double p) {
        if (p <= 0 || p >= 100)
            throw new IllegalArgumentException("desired_probability must be between 0 and 100 (exclusive)");
        Room r = roomRepo.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("room not found"));
        long userPlaces = placeRepo.findAllByRoomId(roomId).stream()
                .filter(p2 -> userId.equals(p2.getUserId())).count();
        int userBoost = boostRepo.findById(new RoomBoost.PK(roomId, userId))
                .map(RoomBoost::getAmount).orElse(0);
        int total = (int) userPlaces * r.getEntryCost() + userBoost;

        long poolBase = (long) r.getPlayersNeeded() * r.getEntryCost();
        long acc = boostRepo.findAllByRoomId(roomId).stream()
                .mapToLong(RoomBoost::getAmount).sum();

        double raw = (p * (poolBase + acc) - 100.0 * total) / (100.0 - p);
        if (raw < 0) raw = 0;
        return (int) Math.ceil(raw);
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
