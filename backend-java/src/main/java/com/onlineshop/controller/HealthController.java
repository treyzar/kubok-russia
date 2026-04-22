package com.onlineshop.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/v1/hello")
    public Map<String, Object> hello() {
        return Map.of("message", "online-shop-java");
    }
}
