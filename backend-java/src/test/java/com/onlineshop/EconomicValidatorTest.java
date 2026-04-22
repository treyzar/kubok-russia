package com.onlineshop;

import com.onlineshop.dto.EconomicValidationResult;
import com.onlineshop.service.EconomicValidator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EconomicValidatorTest {

    private final EconomicValidator v = new EconomicValidator();

    @Test
    void healthyConfig() {
        EconomicValidationResult r = v.validate(10, 100, 80);
        assertEquals(800, r.prizeFund());
        assertEquals(200, r.organiserCut());
        assertEquals(8.0, r.playerROI(), 1e-9);
        assertEquals(0.1, r.playerWinProb(), 1e-9);
        assertTrue(r.isViable());
        assertTrue(r.warnings().isEmpty());
    }

    @Test
    void lowMarginAndProb() {
        EconomicValidationResult r = v.validate(50, 100, 96);
        assertFalse(r.isViable());
        assertTrue(r.warnings().contains("organiser margin is very low"));
        assertTrue(r.warnings().contains("winner_pct leaves no organiser margin"));
        assertTrue(r.warnings().contains("very low win probability may discourage players"));
    }

    @Test
    void unattractivePrize() {
        EconomicValidationResult r = v.validate(2, 100, 49);
        assertFalse(r.isViable());
        assertTrue(r.warnings().contains("prize fund may be unattractive to players"));
        assertTrue(r.warnings().contains("winner receives less than half the jackpot"));
    }
}
