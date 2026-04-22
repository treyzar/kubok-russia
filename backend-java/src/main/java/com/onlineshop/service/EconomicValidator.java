package com.onlineshop.service;

import com.onlineshop.dto.EconomicValidationResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Mirrors backend/internal/validator/economic.go.
 */
@Component
public class EconomicValidator {

    public EconomicValidationResult validate(int playersNeeded, int entryCost, int winnerPct) {
        int fullJackpot = playersNeeded * entryCost;
        int prizeFund = fullJackpot * winnerPct / 100;
        int organiserCut = fullJackpot - prizeFund;

        double playerROI = entryCost > 0 ? (double) prizeFund / entryCost : 0.0;
        double playerWinProb = playersNeeded > 0 ? 1.0 / playersNeeded : 0.0;

        List<String> warnings = new ArrayList<>();
        if (playerROI < 1.5) warnings.add("prize fund may be unattractive to players");
        if (fullJackpot > 0 && organiserCut < fullJackpot * 0.10)
            warnings.add("organiser margin is very low");
        if (winnerPct > 95) warnings.add("winner_pct leaves no organiser margin");
        if (winnerPct < 50) warnings.add("winner receives less than half the jackpot");
        if (playerWinProb < 0.05) warnings.add("very low win probability may discourage players");

        return new EconomicValidationResult(prizeFund, organiserCut, playerROI, playerWinProb,
                warnings, warnings.isEmpty());
    }
}
