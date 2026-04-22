package com.onlineshop.controller;

import com.onlineshop.domain.entity.User;
import com.onlineshop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService users;

    @PostMapping
    public User create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        Object bal = body.getOrDefault("balance", 0);
        return users.create(name, new BigDecimal(bal.toString()));
    }

    @GetMapping("/{id}")
    public User get(@PathVariable Integer id) { return users.get(id); }
}
