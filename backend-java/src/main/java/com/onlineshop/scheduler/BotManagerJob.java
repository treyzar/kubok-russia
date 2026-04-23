package com.onlineshop.scheduler;

import com.onlineshop.repository.RoomTemplateRepository;
import com.onlineshop.repository.UserRepository;
import com.onlineshop.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Equivalent of services/bot_manager (10 s tick).
 *  - Maintains a target population of bots (default 50).
 *  - New bots are named with a random Russian first name + "_<rand 0..9999>"
 *    and start with balance 500 (matches Go {@code rand.Intn(10000)} suffix).
 *  - Bots whose balance drops below {@code LOW_BALANCE_THRESHOLD} are topped up
 *    by {@code REFILL_AMOUNT}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BotManagerJob {

    private static final int BASE_BALANCE = 500;
    /** Safety floor in case there are no active rooms / templates yet. */
    private static final int MIN_TARGET_BALANCE = 500;

    /**
     * 35 Russian first names — must match {@code backend/internal/crons/bot_manager.go}
     * verbatim, including the letter ё in "Артём".
     */
    private static final String[] RUSSIAN_NAMES = {
        "Александр", "Дмитрий", "Максим", "Сергей", "Андрей",
        "Алексей", "Артём", "Илья", "Кирилл", "Михаил",
        "Никита", "Матвей", "Роман", "Егор", "Арсений",
        "Иван", "Денис", "Евгений", "Даниил", "Тимофей",
        "Владимир", "Павел", "Руслан", "Марк", "Глеб",
        "Анна", "Мария", "Елена", "Ольга", "Наталья",
        "Татьяна", "Ирина", "Екатерина", "Светлана", "Юлия"
    };

    private final UserRepository userRepo;
    private final UserService users;
    private final RoomTemplateRepository templateRepo;
    private final SecureRandom rnd = new SecureRandom();

    @Value("${app.bots.target-count:50}")
    private int targetBotCount;

    @Scheduled(fixedRateString = "${app.scheduler.bot-manager-fixed-rate:10000}")
    public void tick() {
        try {
            int targetBalance = computeTargetBalance();
            spawnIfNeeded(targetBalance);
            refillLowBalance(targetBalance);
        } catch (Exception e) {
            log.warn("BotManager tick failed: {}", e.getMessage());
        }
    }

    /**
     * Bots must always have enough cash to fill the most expensive joinable
     * room (and we keep a comfortable headroom of a couple of buy-ins so a
     * single losing streak doesn't sideline them). We look at both currently
     * active rooms and active templates so freshly-created rooms are also
     * covered.
     */
    private int computeTargetBalance() {
        int maxEntry = MIN_TARGET_BALANCE;
        for (var t : templateRepo.findActive()) {
            maxEntry = Math.max(maxEntry, t.getEntryCost());
        }
        // Two full buy-ins of headroom so bots aren't kicked out after one loss.
        return Math.max(MIN_TARGET_BALANCE, maxEntry * 2);
    }

    private void spawnIfNeeded(int targetBalance) {
        long current = userRepo.countByBotTrue();
        int missing = (int) (targetBotCount - current);
        // New bots are spawned with at least the target balance so they can
        // immediately participate in the highest-stakes room.
        int startBalance = Math.max(BASE_BALANCE, targetBalance);
        for (int i = 0; i < missing; i++) {
            String first = RUSSIAN_NAMES[rnd.nextInt(RUSSIAN_NAMES.length)];
            // Match Go's rand.Intn(10000) → range [0..9999] inclusive.
            String name = first + "_" + rnd.nextInt(10000);
            users.create(name, startBalance, true);
        }
        if (missing > 0) log.info("BotManager spawned {} bots (target={}, current={}, startBalance={})",
                missing, targetBotCount, current, startBalance);
    }

    private void refillLowBalance(int targetBalance) {
        var lows = userRepo.findBotsBelowBalance(targetBalance);
        for (var b : lows) {
            int delta = targetBalance - b.getBalance();
            if (delta > 0) users.credit(b.getId(), delta);
        }
        if (!lows.isEmpty()) log.info("BotManager topped up {} bots to balance {}", lows.size(), targetBalance);
    }
}
