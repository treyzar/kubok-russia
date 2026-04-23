package com.onlineshop.controller;

import com.onlineshop.domain.entity.User;
import com.onlineshop.dto.RoomDtos.*;
import com.onlineshop.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
        Object roleRaw = body.get("role");
        com.onlineshop.domain.enums.UserRole role =
                com.onlineshop.domain.enums.UserRole.fromValue(roleRaw == null ? null : roleRaw.toString());
        return users.create(name, ((Number) bal).intValue(), false, role);
    }

    @GetMapping
    public Map<String, List<User>> list() { return Map.of("users", users.list()); }

    @GetMapping("/{id}")
    public User get(@PathVariable Integer id) { return users.get(id); }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Integer id) {
        users.delete(id);
        return Map.of("message", "deleted");
    }

    /** Apply signed delta to balance (PATCH semantics from Go). */
    @PatchMapping("/{id}/balance")
    public User patchBalance(@PathVariable Integer id,
                             @Valid @RequestBody BalancePatchRequest req) {
        return users.patchBalance(id, req.delta());
    }

    @PostMapping("/{id}/balance/increase")
    public User increase(@PathVariable Integer id,
                         @Valid @RequestBody BalanceMoveRequest req) {
        return users.patchBalance(id, req.amount());
    }

    @PostMapping("/{id}/balance/decrease")
    public User decrease(@PathVariable Integer id,
                         @Valid @RequestBody BalanceMoveRequest req) {
        return users.patchBalance(id, -req.amount());
    }

    @PutMapping("/{id}/balance")
    public User setBalance(@PathVariable Integer id,
                           @Valid @RequestBody BalanceSetRequest req) {
        return users.setBalance(id, req.balance());
    }
}
