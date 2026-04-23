package com.onlineshop.domain.enums;

public enum UserRole {
    USER,
    ADMIN;

    public static UserRole fromValue(String s) {
        if (s == null || s.isBlank()) return USER;
        try {
            return UserRole.valueOf(s.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return USER;
        }
    }
}
