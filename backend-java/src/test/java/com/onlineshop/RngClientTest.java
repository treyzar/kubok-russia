package com.onlineshop;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onlineshop.service.RngClient;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/** Java port of backend/tests/rng/rng_test.go. */
class RngClientTest {

    private HttpServer server;

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    private String start(int status, int returnedResult, AtomicReference<Map<String, String>> seen) throws Exception {
        return start(status, returnedResult, 0, seen);
    }

    private String start(int status, int returnedResult, long delayMs,
                         AtomicReference<Map<String, String>> seen) throws Exception {
        ObjectMapper m = new ObjectMapper();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            try {
                if (delayMs > 0) Thread.sleep(delayMs);
                if (seen != null) {
                    Map<String, String> q = new HashMap<>();
                    String raw = ex.getRequestURI().getRawQuery();
                    if (raw != null) for (String p : raw.split("&")) {
                        int i = p.indexOf('=');
                        if (i > 0) q.put(URLDecoder.decode(p.substring(0, i), StandardCharsets.UTF_8),
                                URLDecoder.decode(p.substring(i + 1), StandardCharsets.UTF_8));
                    }
                    seen.set(q);
                }
                if (status == 200) {
                    byte[] body = m.writeValueAsBytes(Map.of("result", returnedResult));
                    ex.getResponseHeaders().set("Content-Type", "application/json");
                    ex.sendResponseHeaders(200, body.length);
                    ex.getResponseBody().write(body);
                } else {
                    ex.sendResponseHeaders(status, -1);
                }
                ex.close();
            } catch (Exception e) { ex.close(); }
        });
        server.start();
        InetSocketAddress addr = server.getAddress();
        return "http://127.0.0.1:" + addr.getPort();
    }

    @Test
    void externalSuccess_returnsServerResult() throws Exception {
        String url = start(200, 5, null);
        RngClient c = new RngClient(url);
        assertEquals(5, c.selectRandom(10, 1, 3));
    }

    @Test
    void fallbackWhenNoUrl_returnsValueInRange() {
        RngClient c = new RngClient("");
        int r = c.selectRandom(100, 1, 3);
        assertTrue(r >= 0 && r < 100);
    }

    @Test
    void fallbackOnServerError_returnsValueInRange() throws Exception {
        String url = start(500, 0, null);
        RngClient c = new RngClient(url);
        int r = c.selectRandom(50, 2, 5);
        assertTrue(r >= 0 && r < 50);
    }

    @Test
    void fallbackOnTimeout_returnsValueInRange() throws Exception {
        String url = start(200, 1, 3500, null);
        RngClient c = new RngClient(url);
        int r = c.selectRandom(20, 3, 4);
        assertTrue(r >= 0 && r < 20);
    }

    @Test
    void fallbackOnOutOfRange_returnsValueInRange() throws Exception {
        String url = start(200, 10, null);
        RngClient c = new RngClient(url);
        int r = c.selectRandom(5, 4, 2);
        assertTrue(r >= 0 && r < 5);
    }

    @Test
    void requestParams_includeMaxRoomIdAndPlayerCount() throws Exception {
        AtomicReference<Map<String, String>> seen = new AtomicReference<>();
        String url = start(200, 0, seen);
        new RngClient(url).selectRandom(10, 42, 7);
        Map<String, String> q = seen.get();
        assertNotNull(q);
        assertEquals("10", q.get("max"));
        assertEquals("42", q.get("room_id"));
        assertEquals("7", q.get("player_count"));
    }

    @Test
    void invalidMax_returnsZero() {
        // Go returns an error for max <= 0; the Java client returns 0 (safe sentinel)
        // and additionally validates via the same code path. Both encode "no choice".
        assertEquals(0, new RngClient("").selectRandom(0, 1, 1));
    }
}
