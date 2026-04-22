package com.onlineshop.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.util.Map;

/**
 * Mirrors backend/internal/rng/RNGClient.
 * Calls GET {baseUrl}?max=&room_id=&player_count=, expects {"result": N} in [0,max).
 * Falls back to local SecureRandom on any error.
 */
@Component
@Slf4j
public class RngClient {

    private final RestClient http;
    private final SecureRandom fallback = new SecureRandom();

    public RngClient(@Value("${app.rng.base-url:}") String baseUrl) {
        this.http = (baseUrl == null || baseUrl.isBlank())
                ? null
                : RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Returns a random int in [0, max). */
    public int selectRandom(int max, int roomId, int playerCount) {
        if (max <= 0) return 0;
        if (http == null) return fallback.nextInt(max);
        try {
            Map<?, ?> body = http.get()
                    .uri(uri -> uri.queryParam("max", max)
                            .queryParam("room_id", roomId)
                            .queryParam("player_count", playerCount).build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new IllegalStateException("rng error: " + res.getStatusCode());
                    })
                    .body(Map.class);
            if (body != null && body.get("result") instanceof Number n) {
                int r = n.intValue();
                if (r >= 0 && r < max) return r;
            }
        } catch (Exception e) {
            log.warn("External RNG failed ({}), using local fallback", e.getMessage());
        }
        return fallback.nextInt(max);
    }

    /** Convenience overload. */
    public int pickInt(int bound) { return selectRandom(bound, 0, 0); }
}
