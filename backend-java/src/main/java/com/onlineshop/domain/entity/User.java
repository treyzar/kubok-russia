package com.onlineshop.domain.entity;

import com.onlineshop.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    /** Game currency — stored as INTEGER to match Go schema (mig 006). */
    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer balance = 0;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Boolean bot = Boolean.FALSE;

    @Column(name = "created_at", nullable = false, updatable = false)
    @lombok.Builder.Default
    private Instant createdAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 16)
    @lombok.Builder.Default
    private UserRole role = UserRole.USER;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (balance == null) balance = 0;
        if (bot == null) bot = Boolean.FALSE;
        if (role == null) role = UserRole.USER;
    }
}
