package com.onlineshop.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.util.Map;

/**
 * Thin wrapper over an external RNG service. Falls back to a local SecureRandom
 * if the remote call fails, mirroring the resilient behaviour of the Go client.
 */
@Component
@Slf4j
public class RngClient {

    private final RestClient http;
    private final SecureRandom fallback = new SecureRandom();

    public RngClient(@Value("${app.rng.base-url:}") String baseUrl) {
        this.http = baseUrl == null || baseUrl.isBlank()
                ? null
                : RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Returns a uniformly random int in [0, bound). */
    public int pickInt(int bound) {
        if (bound <= 0) return 0;
        if (http == null) return fallback.nextInt(bound);
        try {
            Map<?, ?> body = http.get()
                    .uri(uri -> uri.path("/rand").queryParam("bound", bound).build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new IllegalStateException("rng error: " + res.getStatusCode());
                    })
                    .body(Map.class);
            if (body != null && body.get("value") instanceof Number n) return n.intValue() % bound;
        } catch (Exception e) {
            log.warn("rng call failed, using local fallback: {}", e.getMessage());
        }
        return fallback.nextInt(bound);
    }
}
