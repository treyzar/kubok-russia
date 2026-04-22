package com.onlineshop;

import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Java port of backend/tests/fair_rooms/unit_test.go.
 * Pure unit tests for seed generation, refund math, auto-scale ratio,
 * and risk-level visibility ordering.
 */
class FairRoomsUnitTest {

    private static final Pattern HEX = Pattern.compile("^[0-9a-f]+$");
    private static final SecureRandom RAND = new SecureRandom();

    private static String[] generateSeed() throws Exception {
        byte[] buf = new byte[32];
        RAND.nextBytes(buf);
        String seedPhrase = HexFormat.of().formatHex(buf);
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(seedPhrase.getBytes());
        String seedHash = HexFormat.of().formatHex(hash);
        return new String[]{seedPhrase, seedHash};
    }

    @Test
    void seedHash_lengthIs64() throws Exception {
        assertEquals(64, generateSeed()[1].length());
    }

    @Test
    void seedHash_isLowercaseHex() throws Exception {
        assertTrue(HEX.matcher(generateSeed()[1]).matches());
    }

    @Test
    void seedHash_matchesSha256OfPhrase() throws Exception {
        String[] s = generateSeed();
        byte[] expected = MessageDigest.getInstance("SHA-256").digest(s[0].getBytes());
        assertEquals(HexFormat.of().formatHex(expected), s[1]);
    }

    private static double[] computeRefunds(double[] deposits) {
        double min = deposits[0];
        for (double d : deposits) if (d < min) min = d;
        double[] r = new double[deposits.length];
        for (int i = 0; i < deposits.length; i++) {
            double v = deposits[i] - min;
            r[i] = v < 0 ? 0 : v;
        }
        return r;
    }

    private static double minDeposit(double[] deposits) {
        double m = deposits[0];
        for (double d : deposits) if (d < m) m = d;
        return m;
    }

    @Test
    void refund_standardCase() {
        double[] dep = {100, 200, 150};
        assertEquals(100.0, minDeposit(dep));
        assertArrayEquals(new double[]{0, 100, 50}, computeRefunds(dep));
    }

    @Test
    void refund_equalDeposits() {
        double[] dep = {50, 50, 50};
        assertArrayEquals(new double[]{0, 0, 0}, computeRefunds(dep));
    }

    @Test
    void refund_oneMinimum() {
        double[] dep = {30, 80, 60};
        assertArrayEquals(new double[]{0, 50, 30}, computeRefunds(dep));
    }

    private static boolean scaleCheck(int[][] rooms) {
        if (rooms.length == 0) return false;
        int atThreshold = 0;
        for (int[] r : rooms) {
            if ((double) r[0] / r[1] >= 0.70) atThreshold++;
        }
        return (double) atThreshold / rooms.length >= 0.70;
    }

    @Test
    void autoScale_thresholdNotMet() {
        assertFalse(scaleCheck(new int[][]{{3,10},{4,10},{5,10}}));
    }

    @Test
    void autoScale_thresholdMet() {
        assertTrue(scaleCheck(new int[][]{{7,10},{8,10},{9,10}}));
    }

    @Test
    void autoScale_singleRoomAtThreshold() {
        assertTrue(scaleCheck(new int[][]{{7,10}}));
    }

    @Test
    void riskLevelOrder_lowSeesAll() {
        var levels = com.onlineshop.domain.enums.RiskLevel.ORDER
                .get(com.onlineshop.domain.enums.RiskLevel.LOW);
        assertEquals(3, levels.size());
    }

    @Test
    void riskLevelOrder_highSeesOnlyHigh() {
        var levels = com.onlineshop.domain.enums.RiskLevel.ORDER
                .get(com.onlineshop.domain.enums.RiskLevel.HIGH);
        assertEquals(1, levels.size());
        assertEquals(com.onlineshop.domain.enums.RiskLevel.HIGH, levels.get(0));
    }
}
