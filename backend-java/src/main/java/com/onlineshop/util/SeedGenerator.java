package com.onlineshop.util;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class SeedGenerator {
    private static final SecureRandom RNG = new SecureRandom();

    private SeedGenerator() {}

    public record Seed(String phrase, String hash) {}

    public static Seed generate() {
        byte[] buf = new byte[32];
        RNG.nextBytes(buf);
        String phrase = HexFormat.of().formatHex(buf);
        return new Seed(phrase, sha256Hex(phrase));
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes());
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
