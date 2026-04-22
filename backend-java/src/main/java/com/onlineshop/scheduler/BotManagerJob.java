package com.onlineshop.scheduler;

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

    private static final int INITIAL_BALANCE = 500;
    private static final int LOW_BALANCE_THRESHOLD = 500;
    private static final int REFILL_AMOUNT = 200;

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
    private final SecureRandom rnd = new SecureRandom();

    @Value("${app.bots.target-count:50}")
    private int targetBotCount;

    @Scheduled(fixedRateString = "${app.scheduler.bot-manager-fixed-rate:10000}")
    public void tick() {
        try {
            spawnIfNeeded();
            refillLowBalance();
        } catch (Exception e) {
            log.warn("BotManager tick failed: {}", e.getMessage());
        }
    }

    private void spawnIfNeeded() {
        long current = userRepo.countByBotTrue();
        int missing = (int) (targetBotCount - current);
        for (int i = 0; i < missing; i++) {
            String first = RUSSIAN_NAMES[rnd.nextInt(RUSSIAN_NAMES.length)];
            // Match Go's rand.Intn(10000) → range [0..9999] inclusive.
            String name = first + "_" + rnd.nextInt(10000);
            users.create(name, INITIAL_BALANCE, true);
        }
        if (missing > 0) log.info("BotManager spawned {} bots (target={}, current={})",
                missing, targetBotCount, current);
    }

    private void refillLowBalance() {
        var lows = userRepo.findBotsBelowBalance(LOW_BALANCE_THRESHOLD);
        for (var b : lows) {
            users.credit(b.getId(), REFILL_AMOUNT);
        }
        if (!lows.isEmpty()) log.debug("BotManager refilled {} low-balance bots", lows.size());
    }
}
