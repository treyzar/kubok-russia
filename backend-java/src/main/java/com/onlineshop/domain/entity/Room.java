package com.onlineshop.domain.entity;

import com.onlineshop.domain.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "rooms")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Integer roomId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal jackpot = BigDecimal.ZERO;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.NEW;

    @Column(name = "players_needed", nullable = false)
    private Integer playersNeeded;

    @Column(name = "template_id")
    private Integer templateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() { this.updatedAt = Instant.now(); }
}
