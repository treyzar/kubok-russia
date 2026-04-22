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
 *  - New bots are named with a random Russian first name + "_<rand1..9999>"
 *    and start with balance 500 (matches Go).
 *  - Bots whose balance drops below `LOW_BALANCE_THRESHOLD` are topped up by
 *    `REFILL_AMOUNT` to keep gameplay flowing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BotManagerJob {

    private static final int INITIAL_BALANCE = 500;
    private static final int LOW_BALANCE_THRESHOLD = 500;
    private static final int REFILL_AMOUNT = 200;

    /** 35 Russian first names — same list used by the Go service. */
    private static final String[] RUSSIAN_NAMES = {
        "Александр", "Алексей", "Анастасия", "Андрей", "Анна",
        "Антон", "Артем", "Виктор", "Виктория", "Владимир",
        "Дарья", "Дмитрий", "Евгений", "Екатерина", "Елена",
        "Игорь", "Ирина", "Кирилл", "Константин", "Максим",
        "Мария", "Михаил", "Наталья", "Николай", "Ольга",
        "Павел", "Полина", "Роман", "Сергей", "София",
        "Татьяна", "Юлия", "Юрий", "Яна", "Ярослав"
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
            String name = first + "_" + (1 + rnd.nextInt(9999));
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
