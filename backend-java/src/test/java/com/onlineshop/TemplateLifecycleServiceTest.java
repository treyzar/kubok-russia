package com.onlineshop;

import com.onlineshop.domain.enums.GameType;
import com.onlineshop.dto.AdminDtos.TemplateStatus;
import com.onlineshop.dto.TemplateDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Java port of backend/internal/service/template_lifecycle_test.go. */
class TemplateLifecycleServiceTest {

    private static boolean canDelete(int active, int waiting) {
        return new TemplateStatus(1, active, waiting, active == 0 && waiting == 0).canDelete();
    }

    @Test
    void canDelete_noRooms()         { assertTrue(canDelete(0, 0)); }
    @Test
    void cannotDelete_active()       { assertFalse(canDelete(2, 0)); }
    @Test
    void cannotDelete_waiting()      { assertFalse(canDelete(0, 3)); }
    @Test
    void cannotDelete_both()         { assertFalse(canDelete(1, 2)); }

    @Test
    void updateParams_validation() {
        TemplateDto t = new TemplateDto("Test", 5, 3, 100, 70, 60, 10, GameType.TRAIN);
        assertFalse(t.name().isBlank());
        assertTrue(t.playersNeeded() > 0);
        assertTrue(t.entryCost() >= 0);
        assertTrue(t.winnerPct() > 0 && t.winnerPct() <= 99);
        assertTrue(t.minPlayers() > 0);
        assertTrue(t.minPlayers() <= t.playersNeeded());
    }

    @Test
    void deletionErrorFlag_active()  { assertTrue(!canDelete(2, 0)); }
    @Test
    void deletionErrorFlag_waiting() { assertTrue(!canDelete(0, 3)); }
    @Test
    void updateErrorFlag_active()    { assertTrue(!canDelete(1, 0)); }
    @Test
    void updateErrorFlag_waiting()   { assertTrue(!canDelete(0, 2)); }
}
